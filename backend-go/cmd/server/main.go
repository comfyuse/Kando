package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Peer struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Address   string    `json:"address"`
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

type PeerManager struct {
	peers    map[string]Peer
	messages []Message
	mu       sync.RWMutex
}

var peerManager = &PeerManager{
	peers:    make(map[string]Peer),
	messages: []Message{},
}

var clients = make(map[*websocket.Conn]string)
var clientsMu sync.RWMutex
var broadcast = make(chan Message)
var requestBroadcast = make(chan MessageRequest)

// Pre-registered users from the green cells
var preRegisteredUsers = []string{
	"Shaya", "Ali", "Sahand", "Danial", "Sadra", 
	"Farbod", "Arman", "Dorsa", "Bahram", "Farzam", "Behnam",
}

func generatePeerID(name string) string {
	return name + "-cando-peer"
}

func init() {
	// Pre-register all users
	for _, name := range preRegisteredUsers {
		peerID := generatePeerID(name)
		peerManager.peers[peerID] = Peer{
			ID:        peerID,
			Name:      name,
			Address:   "virtual",
			LastSeen:  time.Now(),
		}
		log.Printf("Pre-registered user: %s with ID: %s", name, peerID)
	}
}

func handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	
	peerID := generatePeerID(req.Name)
	
	peerManager.mu.Lock()
	peerManager.peers[peerID] = Peer{
		ID:        peerID,
		Name:      req.Name,
		Address:   r.RemoteAddr,
		LastSeen:  time.Now(),
	}
	peerManager.mu.Unlock()
	
	response := map[string]interface{}{
		"peerId": peerID,
		"name":   req.Name,
		"status": "registered",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	peerID := r.URL.Query().Get("peerId")
	peerName := r.URL.Query().Get("name")
	
	if peerID == "" || peerName == "" {
		http.Error(w, "Missing peerId or name", http.StatusBadRequest)
		return
	}
	
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()
	
	// Register client
	clientsMu.Lock()
	clients[conn] = peerID
	clientsMu.Unlock()
	
	// Update peer status
	peerManager.mu.Lock()
	if peer, exists := peerManager.peers[peerID]; exists {
		peer.LastSeen = time.Now()
		peerManager.peers[peerID] = peer
	} else {
		peerManager.peers[peerID] = Peer{
			ID:        peerID,
			Name:      peerName,
			Address:   r.RemoteAddr,
			LastSeen:  time.Now(),
		}
	}
	peerManager.mu.Unlock()
	
	log.Printf("✅ Peer connected: %s (%s)", peerName, peerID)
	
	// Send existing messages to new client
	peerManager.mu.RLock()
	for _, msg := range peerManager.messages {
		if msg.To == "all" || msg.To == peerID || msg.From == peerID {
			if err := conn.WriteJSON(msg); err != nil {
				break
			}
		}
	}
	peerManager.mu.RUnlock()
	
	// Broadcast peer list update
	broadcastPeerList()
	
	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			break
		}
		
		msg.Timestamp = time.Now()
		msg.ID = time.Now().Format("20060102150405.000")
		
		// Store message
		peerManager.mu.Lock()
		peerManager.messages = append(peerManager.messages, msg)
		if len(peerManager.messages) > 100 {
			peerManager.messages = peerManager.messages[len(peerManager.messages)-100:]
		}
		peerManager.mu.Unlock()
		
		// Broadcast to all connected clients
		broadcast <- msg
	}
	
	// Unregister client
	clientsMu.Lock()
	delete(clients, conn)
	clientsMu.Unlock()
	
	// Broadcast updated peer list
	broadcastPeerList()
	
	log.Printf("Peer disconnected: %s", peerID)
}

func broadcastPeerList() {
	peerManager.mu.RLock()
	peers := make([]Peer, 0, len(peerManager.peers))
	for _, peer := range peerManager.peers {
		peers = append(peers, peer)
	}
	peerManager.mu.RUnlock()
	
	clientsMu.RLock()
	for client := range clients {
		if err := client.WriteJSON(map[string]interface{}{
			"type":  "peer-list",
			"peers": peers,
		}); err != nil {
			client.Close()
			delete(clients, client)
		}
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
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	
	req.Timestamp = time.Now()
	req.Type = "message_request"
	
	log.Printf("📨 Message request from %s to %s: %s", req.FromName, req.To, req.Message)
	
	// Broadcast request to the specific recipient
	requestBroadcast <- req
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "sent"})
}

func handleAcceptRequest(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type string `json:"type"`
		From string `json:"from"`
		To   string `json:"to"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	
	log.Printf("✅ Request accepted from %s to %s", req.From, req.To)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "accepted"})
}

func handleDenyRequest(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type string `json:"type"`
		From string `json:"from"`
		To   string `json:"to"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	
	log.Printf("❌ Request denied from %s to %s", req.From, req.To)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "denied"})
}

func handleGetPeers(w http.ResponseWriter, r *http.Request) {
	peerManager.mu.RLock()
	peers := make([]Peer, 0, len(peerManager.peers))
	for _, peer := range peerManager.peers {
		peers = append(peers, peer)
	}
	peerManager.mu.RUnlock()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(peers)
}

func handleGetMessages(w http.ResponseWriter, r *http.Request) {
	peerManager.mu.RLock()
	messages := make([]Message, len(peerManager.messages))
	copy(messages, peerManager.messages)
	peerManager.mu.RUnlock()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func handleSendMessage(w http.ResponseWriter, r *http.Request) {
	var msg Message
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
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
	
	// Broadcast to all clients
	broadcast <- msg
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "sent", "id": msg.ID})
}

func handleFindPeer(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "Missing name parameter", http.StatusBadRequest)
		return
	}
	
	peerManager.mu.RLock()
	var foundPeer *Peer
	for _, peer := range peerManager.peers {
		if peer.Name == name {
			foundPeer = &peer
			break
		}
	}
	peerManager.mu.RUnlock()
	
	if foundPeer == nil {
		http.Error(w, "Peer not found", http.StatusNotFound)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(foundPeer)
}

func handleGetNodeInfo(w http.ResponseWriter, r *http.Request) {
	peerManager.mu.RLock()
	peerCount := len(peerManager.peers)
	messageCount := len(peerManager.messages)
	peerManager.mu.RUnlock()
	
	clientsMu.RLock()
	wsClients := len(clients)
	clientsMu.RUnlock()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "running",
		"peers":        peerCount,
		"messages":     messageCount,
		"wsClients":    wsClients,
		"timestamp":    time.Now(),
	})
}

func main() {
	// Start broadcast handlers
	go handleBroadcast()
	go handleRequestBroadcast()
	
	r := mux.NewRouter()
	
	// API endpoints
	r.HandleFunc("/api/register", handleRegister).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/peers", handleGetPeers).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/messages", handleGetMessages).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/send", handleSendMessage).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/find-peer", handleFindPeer).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/info", handleGetNodeInfo).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/send-request", handleSendRequest).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/accept-request", handleAcceptRequest).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/deny-request", handleDenyRequest).Methods("POST", "OPTIONS")
	
	// WebSocket endpoint
	r.HandleFunc("/ws", handleWebSocket)
	
	// CORS setup
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})
	
	handler := corsHandler.Handler(r)
	
	log.Println("🚀 CANDO P2P Chat Backend starting on :8080")
	log.Println("📡 WebSocket endpoint: ws://localhost:8080/ws")
	log.Println("🔗 API endpoints: http://localhost:8080/api/...")
	log.Printf("📋 Pre-registered %d users", len(preRegisteredUsers))
	
	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}