package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"cando-backend/pkg/p2p"

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

// cellDHTId derives a deterministic 160-bit hex ID from hexagonal coordinates.
// SHA-256 of "kando-cell:q,r", first 20 bytes as hex — same algorithm as the
// old hand-rolled Kademlia so existing hashes are unchanged.
func cellDHTId(q, r int) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("kando-cell:%d,%d", q, r)))
	return hex.EncodeToString(sum[:20])
}

func cellKey(q, r int) string { return fmt.Sprintf("%d,%d", q, r) }

// ── Domain types ──────────────────────────────────────────────────────────────

type Peer struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Address   string    `json:"address"`
	DHTId     string    `json:"dhtId,omitempty"`
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
	peers     map[string]Peer
	cellIndex map[string]string
	messages  []Message
	msgIndex  map[string]struct{} // dedup by message ID
	mu        sync.RWMutex
}

var peerManager = &PeerManager{
	peers:     make(map[string]Peer),
	cellIndex: make(map[string]string),
	messages:  []Message{},
	msgIndex:  make(map[string]struct{}),
}

var (
	clients          = make(map[*websocket.Conn]string)
	clientsMu        sync.RWMutex
	broadcast        = make(chan Message, 256)
	requestBroadcast = make(chan MessageRequest, 64)
)

// Pre-registered citizens — seeded into the first cells of the hexagonal grid.
var preRegisteredUsers = []struct {
	name  string
	cellI int
}{
	{"Shaya", 0},
	{"Ali", 1},
	{"Sahand", 2},
	{"Danial", 3},
	{"Sadra", 4},
	{"Farbod", 5},
	{"Arman", 6},
	{"Dorsa", 7},
	{"Bahram", 8},
	{"Farzam", 9},
	{"Behnam", 10},
}

func generatePeerID(name string) string { return name + "-cando-peer" }

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

// ── libp2p node (global) ──────────────────────────────────────────────────────

var p2pNode *p2p.Node

// ── Init ──────────────────────────────────────────────────────────────────────

func init() {
	for _, u := range preRegisteredUsers {
		cell := hexCellOrder[u.cellI]
		q, r := cell[0], cell[1]
		peerID := generatePeerID(u.name)
		dhtId := cellDHTId(q, r)
		key := cellKey(q, r)

		peer := Peer{
			ID:       peerID,
			Name:     u.name,
			Address:  "virtual",
			DHTId:    dhtId,
			CellQ:    q,
			CellR:    r,
			LastSeen: time.Now(),
		}
		peerManager.peers[peerID] = peer
		peerManager.cellIndex[key] = peerID
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// announceToP2P publishes a member join/update announcement to the libp2p
// GossipSub network so all connected backend nodes update their local stores.
func announceToP2P(peer Peer) {
	if p2pNode == nil {
		return
	}
	if err := p2pNode.AnnounceMember(p2p.MemberAnnounce{
		Op:     "join",
		PeerID: peer.ID,
		Name:   peer.Name,
		DHTId:  peer.DHTId,
		CellQ:  peer.CellQ,
		CellR:  peer.CellR,
		PubKey: peer.PublicKey,
		Seen:   time.Now(),
	}); err != nil {
		log.Printf("[P2P] announce member %s: %v", peer.Name, err)
	}
}

// publishChatToP2P sends a chat message over GossipSub to all remote nodes.
func publishChatToP2P(msg Message) {
	if p2pNode == nil {
		return
	}
	if err := p2pNode.PublishChat(p2p.ChatMessage{
		ID:        msg.ID,
		From:      msg.From,
		To:        msg.To,
		Content:   msg.Content,
		Room:      msg.Room,
		Timestamp: msg.Timestamp,
	}); err != nil {
		log.Printf("[P2P] publish chat: %v", err)
	}
}

// addMessage deduplicates by ID and appends to the local message store.
// Returns true if the message was new.
func addMessage(msg Message) bool {
	peerManager.mu.Lock()
	defer peerManager.mu.Unlock()
	if _, seen := peerManager.msgIndex[msg.ID]; seen {
		return false
	}
	peerManager.msgIndex[msg.ID] = struct{}{}
	peerManager.messages = append(peerManager.messages, msg)
	if len(peerManager.messages) > 200 {
		// Prune oldest entries from msgIndex too
		pruned := peerManager.messages[:len(peerManager.messages)-200]
		for _, m := range pruned {
			delete(peerManager.msgIndex, m.ID)
		}
		peerManager.messages = peerManager.messages[len(peerManager.messages)-200:]
	}
	return true
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
			go announceToP2P(existing)
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

	go announceToP2P(peer)

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

	// Replay recent messages for this connection
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
		msg.ID = fmt.Sprintf("%d-%s", time.Now().UnixNano(), msg.From)

		if addMessage(msg) {
			go publishChatToP2P(msg)
			broadcast <- msg
		}
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
	msg.ID = fmt.Sprintf("%d-%s", time.Now().UnixNano(), msg.From)
	msg.Timestamp = time.Now()

	if addMessage(msg) {
		go publishChatToP2P(msg)
		broadcast <- msg
	}
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

// handlePeerByHash resolves a Kademlia DHT hash to a peer record.
// The local peer store is kept up-to-date via GossipSub member announcements,
// so no remote DHT lookup is needed.
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

	resp := map[string]interface{}{
		"status":    "running",
		"peers":     peerCount,
		"messages":  msgCount,
		"wsClients": wsClients,
		"timestamp": time.Now(),
	}
	if p2pNode != nil {
		resp["libp2pPeerId"]   = p2pNode.PeerID()
		resp["libp2pAddrs"]    = p2pNode.Addrs()
		resp["libp2pPeers"]    = p2pNode.ConnectedPeers()
		resp["dhtRoutingSize"] = p2pNode.DHTSize()
	}
	writeJSON(w, resp)
}

// handleP2PInfo returns detailed libp2p node information.
// Use this to get the multiaddr to paste as BOOTSTRAP_PEERS on another node.
func handleP2PInfo(w http.ResponseWriter, r *http.Request) {
	if p2pNode == nil {
		http.Error(w, "p2p not initialised", http.StatusServiceUnavailable)
		return
	}
	writeJSON(w, map[string]interface{}{
		"peerId":         p2pNode.PeerID(),
		"addrs":          p2pNode.Addrs(),
		"connectedPeers": p2pNode.ConnectedPeers(),
		"dhtRoutingSize": p2pNode.DHTSize(),
	})
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	ctx := context.Background()

	// ── HTTP port ─────────────────────────────────────────────────────────────
	httpPort := os.Getenv("PORT")
	if httpPort == "" {
		httpPort = "8080"
	}

	// ── libp2p P2P port (separate from HTTP) ──────────────────────────────────
	p2pPort := 9000
	if s := os.Getenv("P2P_PORT"); s != "" {
		if p, err := strconv.Atoi(s); err == nil {
			p2pPort = p
		}
	}

	// ── Start libp2p node ─────────────────────────────────────────────────────
	var err error
	p2pNode, err = p2p.New(ctx, p2pPort)
	if err != nil {
		log.Fatalf("❌ Failed to start libp2p node: %v", err)
	}
	defer p2pNode.Close()

	log.Printf("🌐 libp2p node started  PeerID=%s", p2pNode.PeerID())
	for _, addr := range p2pNode.Addrs() {
		log.Printf("   📡 %s", addr)
	}

	// ── Connect to bootstrap peers ────────────────────────────────────────────
	// Set BOOTSTRAP_PEERS to one or more comma-separated libp2p multiaddrs:
	//   /ip4/1.2.3.4/tcp/9000/p2p/QmPeerID...
	// Get the multiaddr from the /api/p2p/info endpoint of the bootstrap node.
	if bp := os.Getenv("BOOTSTRAP_PEERS"); bp != "" {
		addrs := strings.Split(bp, ",")
		log.Printf("[P2P] connecting to %d bootstrap peer(s)…", len(addrs))
		p2pNode.Connect(addrs)
	} else {
		log.Printf("[P2P] running as bootstrap node (no BOOTSTRAP_PEERS set)")
	}

	// ── Wire P2P → local store + WebSocket bridge ─────────────────────────────
	// Chat messages arriving from remote libp2p nodes are stored locally and
	// forwarded to all local WebSocket clients.
	p2pNode.OnChat(func(cm p2p.ChatMessage) {
		msg := Message{
			ID:        cm.ID,
			From:      cm.From,
			To:        cm.To,
			Content:   cm.Content,
			Room:      cm.Room,
			Timestamp: cm.Timestamp,
		}
		if addMessage(msg) {
			broadcast <- msg
		}
	})

	// Member announcements from remote nodes update the local peer store so that
	// /api/peer-by-hash and peer-list WebSocket events stay consistent across nodes.
	p2pNode.OnMember(func(ma p2p.MemberAnnounce) {
		peerManager.mu.Lock()
		if _, exists := peerManager.peers[ma.PeerID]; !exists {
			ckey := cellKey(ma.CellQ, ma.CellR)
			remotePeer := Peer{
				ID:        ma.PeerID,
				Name:      ma.Name,
				DHTId:     ma.DHTId,
				CellQ:     ma.CellQ,
				CellR:     ma.CellR,
				Address:   "remote-p2p",
				PublicKey: ma.PubKey,
				LastSeen:  ma.Seen,
			}
			peerManager.peers[ma.PeerID] = remotePeer
			if ma.CellQ != 0 || ma.CellR != 0 {
				if _, taken := peerManager.cellIndex[ckey]; !taken {
					peerManager.cellIndex[ckey] = ma.PeerID
				}
			}
			log.Printf("[P2P] 👤 remote member synced: %s (%s)", ma.Name, ma.PeerID)
		} else {
			// Update LastSeen
			p := peerManager.peers[ma.PeerID]
			p.LastSeen = ma.Seen
			if ma.PubKey != "" {
				p.PublicKey = ma.PubKey
			}
			peerManager.peers[ma.PeerID] = p
		}
		peerManager.mu.Unlock()
		broadcastPeerList()
	})

	// ── Announce pre-registered citizens to P2P network ───────────────────────
	go func() {
		// Small delay to let GossipSub mesh form before flooding announces
		time.Sleep(2 * time.Second)
		peerManager.mu.RLock()
		snapshot := make([]Peer, 0, len(peerManager.peers))
		for _, p := range peerManager.peers {
			snapshot = append(snapshot, p)
		}
		peerManager.mu.RUnlock()
		for _, peer := range snapshot {
			announceToP2P(peer)
		}
		log.Printf("[P2P] announced %d citizens to the network", len(snapshot))
	}()

	// Periodic re-announce so nodes that join later receive the member list.
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			peerManager.mu.RLock()
			snapshot := make([]Peer, 0, len(peerManager.peers))
			for _, p := range peerManager.peers {
				snapshot = append(snapshot, p)
			}
			peerManager.mu.RUnlock()
			for _, peer := range snapshot {
				announceToP2P(peer)
			}
		}
	}()

	go handleBroadcast()
	go handleRequestBroadcast()

	// ── HTTP routes ───────────────────────────────────────────────────────────
	r := mux.NewRouter()

	r.HandleFunc("/api/register", handleRegister).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/peers", handleGetPeers).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/members", handleGetMembers).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/messages", handleGetMessages).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/send", handleSendMessage).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/find-peer", handleFindPeer).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/peer-by-hash", handlePeerByHash).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/info", handleGetNodeInfo).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/p2p/info", handleP2PInfo).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/send-request", handleSendRequest).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/accept-request", handleAcceptRequest).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/deny-request", handleDenyRequest).Methods("POST", "OPTIONS")
	r.HandleFunc("/ws", handleWebSocket)

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	log.Printf("🚀 KANDO P2P Backend   HTTP=:%s   P2P=%d", httpPort, p2pPort)
	log.Printf("👥 %d citizens seeded into hexagonal grid", len(peerManager.peers))

	if err := http.ListenAndServe(":"+httpPort, corsHandler.Handler(r)); err != nil {
		log.Fatal("server failed:", err)
	}
}
