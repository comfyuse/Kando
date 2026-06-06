package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"cando-backend/pkg/kademlia"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

// ── WebSocket upgrade ─────────────────────────────────────────────────────────

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ── Hexagonal cell positions ordered ring by ring ─────────────────────────────
// Per the KANDO whitepaper: a member's identity IS their hexagonal coordinate.
// DHT key for a member is derived from (q,r) — not from their name.

var hexCellOrder = [][2]int{
	// Ring 0
	{0, 0},
	// Ring 1
	{1, 0}, {1, -1}, {0, -1}, {-1, 0}, {-1, 1}, {0, 1},
	// Ring 2
	{2, 0}, {2, -1}, {2, -2}, {1, -2}, {0, -2}, {-1, -1},
	{-2, 0}, {-2, 1}, {-2, 2}, {-1, 2}, {0, 2}, {1, 1},
	// Ring 3
	{3, 0}, {3, -1}, {3, -2}, {3, -3}, {2, -3}, {1, -3},
	{0, -3}, {-1, -2}, {-2, -1}, {-3, 0}, {-3, 1}, {-3, 2},
	{-3, 3}, {-2, 3}, {-1, 3}, {0, 3}, {1, 2}, {2, 1},
	// Ring 4
	{4, 0}, {4, -1}, {4, -2}, {4, -3}, {4, -4}, {3, -4},
	{2, -4}, {1, -4}, {0, -4}, {-1, -3}, {-2, -2}, {-3, -1},
	{-4, 0}, {-4, 1}, {-4, 2}, {-4, 3}, {-4, 4}, {-3, 4},
	{-2, 4}, {-1, 4}, {0, 4}, {1, 3}, {2, 2}, {3, 1},
}

// cellDHTId derives a deterministic DHT ID from hexagonal coordinates.
// Same cell always gives same ID — the coordinate IS the identity.
func cellDHTId(q, r int) string {
	return kademlia.NewNodeIDFromString(fmt.Sprintf("kando-cell:%d,%d", q, r)).Hex()
}

func cellKey(q, r int) string { return fmt.Sprintf("%d,%d", q, r) }

// ── Domain types ──────────────────────────────────────────────────────────────

type Peer struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Address   string    `json:"address"`
	DHTId     string    `json:"dhtId,omitempty"`   // derived from cell coordinates
	PublicKey string    `json:"publicKey,omitempty"`
	CellQ     int       `json:"cellQ"`
	CellR     int       `json:"cellR"`
	LastSeen  time.Time `json:"lastSeen"`
}

type Message struct {
	ID        string    `json:"id"`
	From      string    `json:"from"`
	To        string    `json:"to"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
	Room      string    `json:"room"`
}

type MessageRequest struct {
	Type      string    `json:"type"`
	From      string    `json:"from"`
	FromName  string    `json:"fromName"`
	To        string    `json:"to"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// ── Peer manager ──────────────────────────────────────────────────────────────

type PeerManager struct {
	peers       map[string]Peer   // peerId -> Peer
	cellIndex   map[string]string // "q,r" -> peerId
	messages    []Message
	mu          sync.RWMutex
}

var peerManager = &PeerManager{
	peers:     make(map[string]Peer),
	cellIndex: make(map[string]string),
	messages:  []Message{},
}

var (
	clients          = make(map[*websocket.Conn]string)
	clientsMu        sync.RWMutex
	broadcast        = make(chan Message)
	requestBroadcast = make(chan MessageRequest)
)

// Pre-registered citizens — seeded into the first cells of the hexagonal grid.
// Per whitepaper: ring 0 + ring 1 = 7 cells; ring 2 fills the next 12.
var preRegisteredUsers = []struct {
	name  string
	cellI int // index into hexCellOrder
}{
	{"Shaya", 0},  // (0,0)  ring 0 — genesis
	{"Ali", 1},    // (1,0)  ring 1
	{"Sahand", 2}, // (1,-1) ring 1
	{"Danial", 3}, // (0,-1) ring 1
	{"Sadra", 4},  // (-1,0) ring 1
	{"Farbod", 5}, // (-1,1) ring 1
	{"Arman", 6},  // (0,1)  ring 1
	{"Dorsa", 7},  // (2,0)  ring 2
	{"Bahram", 8}, // (2,-1) ring 2
	{"Farzam", 9}, // (2,-2) ring 2
	{"Behnam", 10}, // (1,-2) ring 2
}

func generatePeerID(name string) string { return name + "-cando-peer" }

// assignNextCell returns the next free hexagonal cell coordinates.
func assignNextCell() (int, int, bool) {
	peerManager.mu.RLock()
	defer peerManager.mu.RUnlock()
	for _, cell := range hexCellOrder {
		key := cellKey(cell[0], cell[1])
		if _, taken := peerManager.cellIndex[key]; !taken {
			return cell[0], cell[1], true
		}
	}
	return 0, 0, false
}

// ── DHT node (global) ─────────────────────────────────────────────────────────

var dhtNode *kademlia.Node

// ── Init ──────────────────────────────────────────────────────────────────────

func init() {
	for _, u := range preRegisteredUsers {
		cell := hexCellOrder[u.cellI]
		q, r := cell[0], cell[1]
		peerID := generatePeerID(u.name)
		dhtId := cellDHTId(q, r)
		key := cellKey(q, r)

		p := Peer{
			ID:       peerID,
			Name:     u.name,
			Address:  "virtual",
			DHTId:    dhtId,
			CellQ:    q,
			CellR:    r,
			LastSeen: time.Now(),
		}
		peerManager.peers[peerID] = p
		peerManager.cellIndex[key] = peerID
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// ── HTTP handlers ─────────────────────────────────────────────────────────────

func handleRegister(w http.ResponseWriter, req *http.Request) {
	var body struct {
		Name      string `json:"name"`
		PublicKey string `json:"publicKey"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	peerID := generatePeerID(body.Name)

	// If this peer already has a cell, return their existing registration.
	peerManager.mu.RLock()
	existing, exists := peerManager.peers[peerID]
	peerManager.mu.RUnlock()

	if exists {
		if body.PublicKey != "" {
			peerManager.mu.Lock()
			existing.PublicKey = body.PublicKey
			existing.LastSeen = time.Now()
			peerManager.peers[peerID] = existing
			peerManager.mu.Unlock()
			go storeMemberInDHT(existing)
		}
		writeJSON(w, map[string]interface{}{
			"peerId": existing.ID,
			"dhtId":  existing.DHTId,
			"name":   existing.Name,
			"cellQ":  existing.CellQ,
			"cellR":  existing.CellR,
			"status": "registered",
		})
		return
	}

	// New user — assign next free cell.
	cq, cr, ok := assignNextCell()
	if !ok {
		http.Error(w, "network full", http.StatusServiceUnavailable)
		return
	}

	dhtId := cellDHTId(cq, cr)
	ckey := cellKey(cq, cr)

	peer := Peer{
		ID:        peerID,
		Name:      body.Name,
		Address:   req.RemoteAddr,
		DHTId:     dhtId,
		PublicKey: body.PublicKey,
		CellQ:     cq,
		CellR:     cr,
		LastSeen:  time.Now(),
	}

	peerManager.mu.Lock()
	peerManager.peers[peerID] = peer
	peerManager.cellIndex[ckey] = peerID
	peerManager.mu.Unlock()

	go storeMemberInDHT(peer)

	log.Printf("✅ Registered %s at cell (%d,%d) dhtId=%s", body.Name, cq, cr, dhtId[:8])

	writeJSON(w, map[string]interface{}{
		"peerId": peerID,
		"dhtId":  dhtId,
		"name":   body.Name,
		"cellQ":  cq,
		"cellR":  cr,
		"status": "registered",
	})
}

func storeMemberInDHT(p Peer) {
	data, _ := json.Marshal(p)
	val := string(data)
	dhtNode.StoreValue("cell:"+cellKey(p.CellQ, p.CellR), val, 72*time.Hour)
	dhtNode.StoreValue("peer:"+p.ID, p.Name, 72*time.Hour)
	dhtNode.StoreValue("hash:"+p.DHTId, p.ID, 72*time.Hour)
	if p.PublicKey != "" {
		dhtNode.StoreValue("pubkey:"+p.ID, p.PublicKey, 72*time.Hour)
	}
}

// handleGetMembers returns all registered members with their cell positions.
func handleGetMembers(w http.ResponseWriter, r *http.Request) {
	peerManager.mu.RLock()
	members := make([]Peer, 0, len(peerManager.peers))
	for _, p := range peerManager.peers {
		members = append(members, p)
	}
	peerManager.mu.RUnlock()
	writeJSON(w, members)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	peerID := r.URL.Query().Get("peerId")
	peerName := r.URL.Query().Get("name")
	if peerID == "" || peerName == "" {
		http.Error(w, "missing peerId or name", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	clientsMu.Lock()
	clients[conn] = peerID
	clientsMu.Unlock()

	peerManager.mu.Lock()
	if p, exists := peerManager.peers[peerID]; exists {
		p.LastSeen = time.Now()
		peerManager.peers[peerID] = p
	}
	peerManager.mu.Unlock()

	log.Printf("🔌 WS connected: %s (%s)", peerName, peerID)

	peerManager.mu.RLock()
	for _, msg := range peerManager.messages {
		if msg.To == "all" || msg.To == peerID || msg.From == peerID {
			if err := conn.WriteJSON(msg); err != nil {
				break
			}
		}
	}
	peerManager.mu.RUnlock()

	broadcastPeerList()

	for {
		var msg Message
		if err := conn.ReadJSON(&msg); err != nil {
			break
		}
		msg.Timestamp = time.Now()
		msg.ID = time.Now().Format("20060102150405.000")

		peerManager.mu.Lock()
		peerManager.messages = append(peerManager.messages, msg)
		if len(peerManager.messages) > 100 {
			peerManager.messages = peerManager.messages[len(peerManager.messages)-100:]
		}
		peerManager.mu.Unlock()

		go dhtNode.StoreValue("msg:"+msg.ID, msg.Content, 48*time.Hour)

		broadcast <- msg
	}

	clientsMu.Lock()
	delete(clients, conn)
	clientsMu.Unlock()
	broadcastPeerList()
	log.Printf("🔌 WS disconnected: %s", peerID)
}

func broadcastPeerList() {
	peerManager.mu.RLock()
	peers := make([]Peer, 0, len(peerManager.peers))
	for _, p := range peerManager.peers {
		peers = append(peers, p)
	}
	peerManager.mu.RUnlock()

	clientsMu.RLock()
	for client := range clients {
		client.WriteJSON(map[string]interface{}{"type": "peer-list", "peers": peers})
	}
	clientsMu.RUnlock()
}

func handleBroadcast() {
	for msg := range broadcast {
		clientsMu.RLock()
		for client := range clients {
			if err := client.WriteJSON(msg); err != nil {
				client.Close()
				delete(clients, client)
			}
		}
		clientsMu.RUnlock()
	}
}

func handleRequestBroadcast() {
	for req := range requestBroadcast {
		clientsMu.RLock()
		for client, clientID := range clients {
			if clientID == req.To {
				if err := client.WriteJSON(req); err != nil {
					client.Close()
					delete(clients, client)
				}
			}
		}
		clientsMu.RUnlock()
	}
}

func handleSendRequest(w http.ResponseWriter, r *http.Request) {
	var req MessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	req.Timestamp = time.Now()
	req.Type = "message_request"
	requestBroadcast <- req
	writeJSON(w, map[string]string{"status": "sent"})
}

func handleAcceptRequest(w http.ResponseWriter, r *http.Request) {
	var req struct{ Type, From, To string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	writeJSON(w, map[string]string{"status": "accepted"})
}

func handleDenyRequest(w http.ResponseWriter, r *http.Request) {
	var req struct{ Type, From, To string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	writeJSON(w, map[string]string{"status": "denied"})
}

func handleGetPeers(w http.ResponseWriter, r *http.Request) {
	peerManager.mu.RLock()
	peers := make([]Peer, 0, len(peerManager.peers))
	for _, p := range peerManager.peers {
		peers = append(peers, p)
	}
	peerManager.mu.RUnlock()
	writeJSON(w, peers)
}

func handleGetMessages(w http.ResponseWriter, r *http.Request) {
	peerManager.mu.RLock()
	msgs := make([]Message, len(peerManager.messages))
	copy(msgs, peerManager.messages)
	peerManager.mu.RUnlock()
	writeJSON(w, msgs)
}

func handleSendMessage(w http.ResponseWriter, r *http.Request) {
	var msg Message
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	msg.ID = time.Now().Format("20060102150405.000")
	msg.Timestamp = time.Now()

	peerManager.mu.Lock()
	peerManager.messages = append(peerManager.messages, msg)
	if len(peerManager.messages) > 100 {
		peerManager.messages = peerManager.messages[len(peerManager.messages)-100:]
	}
	peerManager.mu.Unlock()

	go dhtNode.StoreValue("msg:"+msg.ID, msg.Content, 48*time.Hour)

	broadcast <- msg
	writeJSON(w, map[string]string{"status": "sent", "id": msg.ID})
}

func handleFindPeer(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "missing name parameter", http.StatusBadRequest)
		return
	}

	peerManager.mu.RLock()
	var found *Peer
	for _, p := range peerManager.peers {
		if p.Name == name {
			cp := p
			found = &cp
			break
		}
	}
	peerManager.mu.RUnlock()

	if found == nil {
		http.Error(w, "peer not found", http.StatusNotFound)
		return
	}
	writeJSON(w, found)
}

func handlePeerByHash(w http.ResponseWriter, r *http.Request) {
	hash := r.URL.Query().Get("hash")
	if hash == "" {
		http.Error(w, "missing hash parameter", http.StatusBadRequest)
		return
	}

	peerManager.mu.RLock()
	var found *Peer
	for _, p := range peerManager.peers {
		if p.DHTId == hash {
			cp := p
			found = &cp
			break
		}
	}
	peerManager.mu.RUnlock()

	if found != nil {
		writeJSON(w, found)
		return
	}

	if peerID, ok := dhtNode.LookupValue("hash:" + hash); ok {
		peerManager.mu.RLock()
		p, exists := peerManager.peers[peerID]
		peerManager.mu.RUnlock()
		if exists {
			writeJSON(w, p)
			return
		}
	}

	http.Error(w, "peer not found", http.StatusNotFound)
}

func handleGetNodeInfo(w http.ResponseWriter, r *http.Request) {
	peerManager.mu.RLock()
	peerCount := len(peerManager.peers)
	msgCount := len(peerManager.messages)
	peerManager.mu.RUnlock()

	clientsMu.RLock()
	wsClients := len(clients)
	clientsMu.RUnlock()

	writeJSON(w, map[string]interface{}{
		"status":    "running",
		"peers":     peerCount,
		"messages":  msgCount,
		"wsClients": wsClients,
		"dhtNodeId": dhtNode.Self().ID.Hex(),
		"timestamp": time.Now(),
	})
}

func handleDHTLookup(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		http.Error(w, "missing key", http.StatusBadRequest)
		return
	}
	val, ok := dhtNode.LookupValue(key)
	if !ok {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, map[string]string{"key": key, "value": val})
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	selfAddr := "localhost:" + port
	bootstrapAddr := os.Getenv("BOOTSTRAP_NODE")

	dhtNode = kademlia.NewNode(selfAddr)
	if bootstrapAddr != "" {
		if err := dhtNode.Bootstrap(bootstrapAddr); err != nil {
			log.Printf("[DHT] bootstrap warning: %v", err)
		}
	} else {
		log.Printf("[DHT] Running as bootstrap node")
	}
	dhtNode.StartRepublish()

	// Seed pre-registered members into DHT
	for _, p := range peerManager.peers {
		go storeMemberInDHT(p)
	}

	go handleBroadcast()
	go handleRequestBroadcast()

	r := mux.NewRouter()

	r.HandleFunc("/api/register", handleRegister).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/peers", handleGetPeers).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/members", handleGetMembers).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/messages", handleGetMessages).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/send", handleSendMessage).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/find-peer", handleFindPeer).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/peer-by-hash", handlePeerByHash).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/info", handleGetNodeInfo).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/send-request", handleSendRequest).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/accept-request", handleAcceptRequest).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/deny-request", handleDenyRequest).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/dht/lookup", handleDHTLookup).Methods("GET", "OPTIONS")
	r.HandleFunc("/ws", handleWebSocket)

	// DHT inbound RPC endpoints
	dhtMux := http.NewServeMux()
	dhtNode.RegisterHandlers(dhtMux)
	for _, path := range []string{"/dht/ping", "/dht/find_node", "/dht/find_value", "/dht/store", "/dht/info"} {
		p := path
		r.HandleFunc(p, func(w http.ResponseWriter, req *http.Request) { dhtMux.ServeHTTP(w, req) })
	}

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	log.Printf("🚀 KANDO P2P Backend :%s", port)
	log.Printf("🌐 DHT node ID: %s", dhtNode.Self().ID.Hex())
	log.Printf("👥 %d citizens seeded into hexagonal grid", len(peerManager.peers))

	if err := http.ListenAndServe(":"+port, corsHandler.Handler(r)); err != nil {
		log.Fatal("server failed:", err)
	}
}
