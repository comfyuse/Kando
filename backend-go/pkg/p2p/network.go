package p2p

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type PeerConnection struct {
	ID         string
	Name       string
	Conn       *websocket.Conn
	Send       chan []byte
	LastActive time.Time
}

type P2PNetwork struct {
	peers        map[string]*PeerConnection
	localPeerID  string
	localName    string
	register     chan *PeerConnection
	unregister   chan string
	broadcast    chan []byte
	messageQueue chan Message
	mu           sync.RWMutex
}

type Message struct {
	Type      string      `json:"type"`
	From      string      `json:"from"`
	To        string      `json:"to"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

func NewP2PNetwork(peerID, name string) *P2PNetwork {
	return &P2PNetwork{
		peers:        make(map[string]*PeerConnection),
		localPeerID:  peerID,
		localName:    name,
		register:     make(chan *PeerConnection),
		unregister:   make(chan string),
		broadcast:    make(chan []byte),
		messageQueue: make(chan Message, 100),
	}
}

func (n *P2PNetwork) Run() {
	for {
		select {
		case peer := <-n.register:
			n.mu.Lock()
			n.peers[peer.ID] = peer
			n.mu.Unlock()
			log.Printf("Peer registered: %s (%s)", peer.Name, peer.ID)
			
		case id := <-n.unregister:
			n.mu.Lock()
			if peer, exists := n.peers[id]; exists {
				close(peer.Send)
				delete(n.peers, id)
				log.Printf("Peer unregistered: %s", id)
			}
			n.mu.Unlock()
			
		case message := <-n.broadcast:
			n.mu.RLock()
			for _, peer := range n.peers {
				select {
				case peer.Send <- message:
				default:
					close(peer.Send)
					delete(n.peers, peer.ID)
				}
			}
			n.mu.RUnlock()
		}
	}
}

func (n *P2PNetwork) AddPeer(conn *websocket.Conn, peerID, peerName string) {
	peer := &PeerConnection{
		ID:         peerID,
		Name:       peerName,
		Conn:       conn,
		Send:       make(chan []byte, 256),
		LastActive: time.Now(),
	}
	
	n.register <- peer
	
	go n.writePump(peer)
	go n.readPump(peer)
}

func (n *P2PNetwork) writePump(peer *PeerConnection) {
	defer func() {
		peer.Conn.Close()
		n.unregister <- peer.ID
	}()
	
	for {
		select {
		case message, ok := <-peer.Send:
			if !ok {
				peer.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			
			peer.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := peer.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
			peer.LastActive = time.Now()
		}
	}
}

func (n *P2PNetwork) readPump(peer *PeerConnection) {
	defer func() {
		n.unregister <- peer.ID
		peer.Conn.Close()
	}()
	
	for {
		var msg Message
		err := peer.Conn.ReadJSON(&msg)
		if err != nil {
			break
		}
		
		peer.LastActive = time.Now()
		
		switch msg.Type {
		case "chat":
			n.messageQueue <- msg
		case "ping":
			n.sendToPeer(peer.ID, Message{
				Type: "pong",
				From: n.localPeerID,
				To:   peer.ID,
			})
		}
	}
}

func (n *P2PNetwork) sendToPeer(peerID string, msg Message) {
	n.mu.RLock()
	peer, exists := n.peers[peerID]
	n.mu.RUnlock()
	
	if exists {
		data, _ := json.Marshal(msg)
		select {
		case peer.Send <- data:
		default:
			n.unregister <- peerID
		}
	}
}

func (n *P2PNetwork) BroadcastMessage(msg Message) {
	data, _ := json.Marshal(msg)
	n.broadcast <- data
}

func (n *P2PNetwork) GetPeerList() []map[string]string {
	n.mu.RLock()
	defer n.mu.RUnlock()
	
	peers := make([]map[string]string, 0, len(n.peers))
	for id, peer := range n.peers {
		peers = append(peers, map[string]string{
			"id":   id,
			"name": peer.Name,
		})
	}
	return peers
}

func (n *P2PNetwork) GetMessageQueue() <-chan Message {
	return n.messageQueue
}

func GenerateRandomID() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}