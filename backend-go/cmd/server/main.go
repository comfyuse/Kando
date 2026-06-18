package main

import (
	"context"
	"crypto/rand"
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

// Per the KANDO whitepaper: a member's identity IS their hexagonal coordinate.
// The hive starts with ONE permanent cell — the queen at (0,0). Every other
// cell is claimed exclusively through an invite link issued by a citizen.

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
	HasCell   bool      `json:"hasCell"` // guests (no invite yet) hold no cell
	Status    string    `json:"status"`  // guest | reserved | candidate | citizen (derived from occupancy)
	LastSeen  time.Time `json:"lastSeen"`
}

// Invite reserves an empty coordinate for whoever opens the invite link.
type Invite struct {
	Token    string    `json:"token"`
	From     string    `json:"from"`     // inviter peerId
	FromName string    `json:"fromName"` // inviter display name
	CellQ    int       `json:"cellQ"`
	CellR    int       `json:"cellR"`
	Created  time.Time `json:"created"`
}

// ── Citizenship stages (hambalidan protocol) ──────────────────────────────────
// A node's stage is derived purely from cell OCCUPANCY:
//   RESERVED  — occupies a cell (an accepted invitation; not active yet)
//   CANDIDATE — all 6 direct neighbour cells are occupied (any stage)
//   CITIZEN   — each of those 6 neighbours itself has 6 occupied neighbours
// The queen cell (0,0) is a CITIZEN from genesis.

var hexDirs = [6][2]int{{1, 0}, {1, -1}, {0, -1}, {-1, 0}, {-1, 1}, {0, 1}}

// cellStage computes the stage of the node at (q,r). Caller must hold
// peerManager.mu (read) — occupancy is read from cellIndex.
func cellStage(q, r int) string {
	if q == 0 && r == 0 {
		return "citizen"
	}
	full := func(q, r int) bool {
		for _, d := range hexDirs {
			if _, ok := peerManager.cellIndex[cellKey(q+d[0], r+d[1])]; !ok {
				return false
			}
		}
		return true
	}
	if !full(q, r) {
		return "reserved"
	}
	for _, d := range hexDirs {
		if !full(q+d[0], r+d[1]) {
			return "candidate"
		}
	}
	return "citizen"
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
	invites   map[string]Invite // token → pending invite
	queenID   string            // peerId of the queen — set once, kept forever
	messages  []Message
	msgIndex  map[string]struct{} // dedup by message ID
	mu        sync.RWMutex
}

var peerManager = &PeerManager{
	peers:     make(map[string]Peer),
	cellIndex: make(map[string]string),
	invites:   make(map[string]Invite),
	messages:  []Message{},
	msgIndex:  make(map[string]struct{}),
}

var (
	clients          = make(map[*websocket.Conn]string)
	clientsMu        sync.RWMutex
	broadcast        = make(chan Message, 256)
	requestBroadcast = make(chan MessageRequest, 64)
)

func generatePeerID(name string) string { return name + "-cando-peer" }

func randToken() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}

// ── libp2p node (global) ──────────────────────────────────────────────────────

var p2pNode *p2p.Node

// ── Persistence ───────────────────────────────────────────────────────────────
// The hive is permanent: the queen's claim on (0,0) and every accepted invite
// survive restarts via a JSON state file next to the binary.

var stateFile = func() string {
	if f := os.Getenv("STATE_FILE"); f != "" {
		return f
	}
	return "kando-state.json"
}()

type persistedState struct {
	QueenID string            `json:"queenId"`
	Peers   map[string]Peer   `json:"peers"`
	Invites map[string]Invite `json:"invites"`
}

func loadState() {
	data, err := os.ReadFile(stateFile)
	if err != nil {
		return
	}
	var st persistedState
	if err := json.Unmarshal(data, &st); err != nil {
		log.Printf("⚠️ could not parse %s: %v", stateFile, err)
		return
	}
	peerManager.mu.Lock()
	defer peerManager.mu.Unlock()
	if st.Peers != nil {
		peerManager.peers = st.Peers
	}
	if st.Invites != nil {
		peerManager.invites = st.Invites
	}
	peerManager.queenID = st.QueenID
	for id, p := range peerManager.peers {
		if p.HasCell {
			peerManager.cellIndex[cellKey(p.CellQ, p.CellR)] = id
		}
	}
	log.Printf("💾 restored %d member(s), %d pending invite(s) from %s",
		len(peerManager.peers), len(peerManager.invites), stateFile)
}

// saveStateLocked persists the hive. Caller must hold peerManager.mu (write).
func saveStateLocked() {
	st := persistedState{
		QueenID: peerManager.queenID,
		Peers:   peerManager.peers,
		Invites: peerManager.invites,
	}
	data, err := json.MarshalIndent(st, "", "  ")
	if err != nil {
		return
	}
	tmp := stateFile + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		log.Printf("⚠️ persist failed: %v", err)
		return
	}
	if err := os.Rename(tmp, stateFile); err != nil {
		log.Printf("⚠️ persist failed: %v", err)
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// snapshotPeers returns all peers with their derived citizenship stage filled in.
func snapshotPeers() []Peer {
	peerManager.mu.RLock()
	defer peerManager.mu.RUnlock()
	peers := make([]Peer, 0, len(peerManager.peers))
	for _, p := range peerManager.peers {
		if p.HasCell {
			p.Status = cellStage(p.CellQ, p.CellR)
		} else {
			p.Status = "guest"
		}
		peers = append(peers, p)
	}
	return peers
}

// announceToP2P publishes a member join/update announcement to the libp2p
// GossipSub network so all connected backend nodes update their local stores.
func announceToP2P(peer Peer) {
	if p2pNode == nil || !peer.HasCell {
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

// registrationResponse builds the standard register/accept payload.
// Caller must hold peerManager.mu (read or write).
func registrationResponse(p Peer) map[string]interface{} {
	stage := "guest"
	if p.HasCell {
		stage = cellStage(p.CellQ, p.CellR)
	}
	return map[string]interface{}{
		"peerId":  p.ID,
		"dhtId":   p.DHTId,
		"name":    p.Name,
		"cellQ":   p.CellQ,
		"cellR":   p.CellR,
		"hasCell": p.HasCell,
		"isQueen": p.ID == peerManager.queenID,
		"stage":   stage,
		"status":  "registered",
	}
}

// handleRegister: the FIRST member ever becomes the queen and permanently owns
// cell (0,0) with its Kademlia DHT id. Everyone after that registers as a
// cell-less GUEST — claiming a cell requires accepting an invite link.
func handleRegister(w http.ResponseWriter, req *http.Request) {
	var body struct {
		Name      string `json:"name"`
		PublicKey string `json:"publicKey"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil || body.Name == "" {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	peerID := generatePeerID(body.Name)

	peerManager.mu.Lock()

	if existing, exists := peerManager.peers[peerID]; exists {
		if body.PublicKey != "" {
			existing.PublicKey = body.PublicKey
		}
		existing.LastSeen = time.Now()
		peerManager.peers[peerID] = existing
		resp := registrationResponse(existing)
		saveStateLocked()
		peerManager.mu.Unlock()
		go announceToP2P(existing)
		writeJSON(w, resp)
		return
	}

	peer := Peer{
		ID:        peerID,
		Name:      body.Name,
		Address:   req.RemoteAddr,
		PublicKey: body.PublicKey,
		LastSeen:  time.Now(),
	}

	if peerManager.queenID == "" {
		// 👑 Genesis: this member is the queen — cell (0,0) is hers forever.
		peer.CellQ, peer.CellR = 0, 0
		peer.HasCell = true
		peer.DHTId = cellDHTId(0, 0)
		peerManager.queenID = peerID
		peerManager.cellIndex[cellKey(0, 0)] = peerID
		log.Printf("👑 Queen registered: %s owns cell (0,0) dhtId=%s", body.Name, peer.DHTId[:8])
	} else {
		log.Printf("👤 Guest registered: %s (no cell — needs an invite)", body.Name)
	}

	peerManager.peers[peerID] = peer
	resp := registrationResponse(peer)
	saveStateLocked()
	peerManager.mu.Unlock()

	if peer.HasCell {
		go announceToP2P(peer)
	}
	writeJSON(w, resp)
}

// ── Invites ───────────────────────────────────────────────────────────────────

// handleCreateInvite: a CITIZEN reserves an empty coordinate for an invitee and
// gets back a one-time token to embed in the invite link. Per the whitepaper
// there is NO adjacency condition — any citizen may invite to any empty cell.
func handleCreateInvite(w http.ResponseWriter, r *http.Request) {
	var body struct {
		From string `json:"from"`
		Q    int    `json:"q"`
		R    int    `json:"r"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	peerManager.mu.Lock()
	defer peerManager.mu.Unlock()

	inviter, ok := peerManager.peers[body.From]
	if !ok || !inviter.HasCell {
		http.Error(w, "inviter not found or holds no cell", http.StatusForbidden)
		return
	}
	if cellStage(inviter.CellQ, inviter.CellR) != "citizen" {
		http.Error(w, "only citizens can invite", http.StatusForbidden)
		return
	}
	key := cellKey(body.Q, body.R)
	if _, taken := peerManager.cellIndex[key]; taken {
		http.Error(w, "cell already occupied", http.StatusConflict)
		return
	}
	for _, inv := range peerManager.invites {
		if inv.CellQ == body.Q && inv.CellR == body.R {
			// Idempotent: re-issue the existing pending invite for this cell
			writeJSON(w, inv)
			return
		}
	}

	invite := Invite{
		Token:    randToken(),
		From:     inviter.ID,
		FromName: inviter.Name,
		CellQ:    body.Q,
		CellR:    body.R,
		Created:  time.Now(),
	}
	peerManager.invites[invite.Token] = invite
	saveStateLocked()

	log.Printf("✉️  Invite created by %s for cell (%d,%d) token=%s…", inviter.Name, body.Q, body.R, invite.Token[:8])
	writeJSON(w, invite)
}

func handleListInvites(w http.ResponseWriter, r *http.Request) {
	peerManager.mu.RLock()
	invites := make([]Invite, 0, len(peerManager.invites))
	for _, inv := range peerManager.invites {
		invites = append(invites, inv)
	}
	peerManager.mu.RUnlock()
	writeJSON(w, invites)
}

func handleInviteInfo(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	peerManager.mu.RLock()
	inv, ok := peerManager.invites[token]
	peerManager.mu.RUnlock()
	if !ok {
		http.Error(w, "invite not found or already used", http.StatusNotFound)
		return
	}
	writeJSON(w, inv)
}

// handleAcceptInvite: the invitee claims the reserved coordinate. The cell
// becomes theirs (RESERVED stage) and gets its deterministic Kademlia DHT id.
func handleAcceptInvite(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token     string `json:"token"`
		Name      string `json:"name"`
		PublicKey string `json:"publicKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	peerManager.mu.Lock()

	inv, ok := peerManager.invites[body.Token]
	if !ok {
		peerManager.mu.Unlock()
		http.Error(w, "invite not found or already used", http.StatusNotFound)
		return
	}

	peerID := generatePeerID(body.Name)
	key := cellKey(inv.CellQ, inv.CellR)

	if existing, exists := peerManager.peers[peerID]; exists && existing.HasCell {
		peerManager.mu.Unlock()
		http.Error(w, "this name already holds a cell", http.StatusConflict)
		return
	}
	if _, taken := peerManager.cellIndex[key]; taken {
		delete(peerManager.invites, body.Token)
		saveStateLocked()
		peerManager.mu.Unlock()
		http.Error(w, "cell already occupied", http.StatusConflict)
		return
	}

	peer := Peer{
		ID:        peerID,
		Name:      body.Name,
		Address:   r.RemoteAddr,
		PublicKey: body.PublicKey,
		DHTId:     cellDHTId(inv.CellQ, inv.CellR),
		CellQ:     inv.CellQ,
		CellR:     inv.CellR,
		HasCell:   true,
		LastSeen:  time.Now(),
	}
	peerManager.peers[peerID] = peer
	peerManager.cellIndex[key] = peerID
	delete(peerManager.invites, body.Token)
	resp := registrationResponse(peer)
	saveStateLocked()
	peerManager.mu.Unlock()

	go announceToP2P(peer)
	broadcastPeerList()

	log.Printf("🐝 %s accepted invite → cell (%d,%d) dhtId=%s", body.Name, inv.CellQ, inv.CellR, peer.DHTId[:8])
	writeJSON(w, resp)
}

func handleGetMembers(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, snapshotPeers())
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
	peers := snapshotPeers()

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
	writeJSON(w, snapshotPeers())
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
			cp.Status = cellStage(cp.CellQ, cp.CellR)
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
			cp.Status = cellStage(cp.CellQ, cp.CellR)
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

	// Restore the permanent hive (queen + members + pending invites) from disk.
	loadState()

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
	p2pNode, err = p2p.New(ctx, p2pPort, kandoValidator{}, os.Getenv("DHT_PATH"))
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
				HasCell:   true, // only cell holders are announced over P2P
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
	r.HandleFunc("/api/invite", handleCreateInvite).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/invites", handleListInvites).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/invite/info", handleInviteInfo).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/invite/accept", handleAcceptInvite).Methods("POST", "OPTIONS")
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

	// Account auth (email + password, security-question reset)
	registerAuthRoutes(r)

	// Waitlist (public front door — email capture, no access granted)
	registerWaitlistRoutes(r)

	// Key-based cell identity (issuer mint, key login — the new model)
	registerCellRoutes(r)

	r.HandleFunc("/ws", handleWebSocket)

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"https://kandonet.com", "https://www.kandonet.com", "http://localhost:3000", "http://localhost:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	log.Printf("🚀 KANDO P2P Backend   HTTP=:%s   P2P=%d", httpPort, p2pPort)
	peerManager.mu.RLock()
	if peerManager.queenID == "" {
		log.Printf("👑 Hive is empty — the first member to register becomes the queen at (0,0)")
	} else {
		log.Printf("👑 Queen: %s   members: %d   pending invites: %d",
			peerManager.queenID, len(peerManager.peers), len(peerManager.invites))
	}
	peerManager.mu.RUnlock()

	if err := http.ListenAndServe(":"+httpPort, corsHandler.Handler(r)); err != nil {
		log.Fatal("server failed:", err)
	}
}
