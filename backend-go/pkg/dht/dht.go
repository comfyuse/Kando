package dht

import (
	"crypto/sha256"
	"encoding/hex"
	"sync"
	"time"
)

type Peer struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Address   string    `json:"address"`
	PublicKey string    `json:"publicKey"`
	LastSeen  time.Time `json:"lastSeen"`
}

type Message struct {
	ID        string    `json:"id"`
	From      string    `json:"from"`
	To        string    `json:"to"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
	Room      string    `json:"room"`
	Signature string    `json:"signature"`
}

type DHT struct {
	peers    map[string]Peer
	messages map[string][]Message
	mu       sync.RWMutex
}

func NewDHT() *DHT {
	return &DHT{
		peers:    make(map[string]Peer),
		messages: make(map[string][]Message),
	}
}

func (d *DHT) GeneratePeerID(name string) string {
	hash := sha256.Sum256([]byte(name + time.Now().String()))
	return hex.EncodeToString(hash[:])[:16]
}

func (d *DHT) RegisterPeer(peer Peer) {
	d.mu.Lock()
	defer d.mu.Unlock()
	peer.LastSeen = time.Now()
	d.peers[peer.ID] = peer
}

func (d *DHT) GetPeer(id string) (Peer, bool) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	peer, exists := d.peers[id]
	return peer, exists
}

func (d *DHT) GetAllPeers() []Peer {
	d.mu.RLock()
	defer d.mu.RUnlock()
	peers := make([]Peer, 0, len(d.peers))
	for _, peer := range d.peers {
		peers = append(peers, peer)
	}
	return peers
}

func (d *DHT) StoreMessage(msg Message) {
	d.mu.Lock()
	defer d.mu.Unlock()
	
	if _, exists := d.messages[msg.Room]; !exists {
		d.messages[msg.Room] = []Message{}
	}
	d.messages[msg.Room] = append(d.messages[msg.Room], msg)
	
	if len(d.messages[msg.Room]) > 100 {
		d.messages[msg.Room] = d.messages[msg.Room][len(d.messages[msg.Room])-100:]
	}
}

func (d *DHT) GetMessages(room string) []Message {
	d.mu.RLock()
	defer d.mu.RUnlock()
	
	if messages, exists := d.messages[room]; exists {
		return messages
	}
	return []Message{}
}

func (d *DHT) FindPeerByName(name string) (Peer, bool) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	
	for _, peer := range d.peers {
		if peer.Name == name {
			return peer, true
		}
	}
	return Peer{}, false
}

func (d *DHT) UpdatePeerStatus(id string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	
	if peer, exists := d.peers[id]; exists {
		peer.LastSeen = time.Now()
		d.peers[id] = peer
	}
}

func (d *DHT) RemoveOldPeers(maxAge time.Duration) {
	d.mu.Lock()
	defer d.mu.Unlock()
	
	now := time.Now()
	for id, peer := range d.peers {
		if now.Sub(peer.LastSeen) > maxAge {
			delete(d.peers, id)
		}
	}
}