package kademlia

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
)

const alpha = 3 // concurrency parameter for iterative lookups

// Node is a fully-functional Kademlia DHT node.
type Node struct {
	self    Contact
	rt      *RoutingTable
	store   *Store
	mu      sync.Mutex
}

func NewNode(selfAddr string) *Node {
	id := NewNodeIDFromString(selfAddr + time.Now().String())
	self := Contact{ID: id, Address: selfAddr}
	return &Node{
		self:  self,
		rt:    NewRoutingTable(id),
		store: NewStore(),
	}
}

func (n *Node) Self() Contact { return n.self }

// ── Bootstrap ─────────────────────────────────────────────────────────────────

// Bootstrap connects to a known node and populates the routing table by
// performing a FIND_NODE lookup for our own ID.
func (n *Node) Bootstrap(knownAddr string) error {
	if knownAddr == "" || knownAddr == n.self.Address {
		return nil
	}

	// Ping the bootstrap node to learn its ID
	knownContact := Contact{
		ID:      NewNodeIDFromString(knownAddr),
		Address: knownAddr,
	}
	resp, err := RPCPing(n.self, knownContact)
	if err != nil {
		return err
	}

	n.rt.Update(resp.Sender)
	log.Printf("[DHT] Bootstrapped via %s (id=%s)", knownAddr, resp.Sender.ID.String())

	// Lookup our own ID to fill the routing table
	n.LookupNode(n.self.ID)
	return nil
}

// ── Iterative FIND_NODE ───────────────────────────────────────────────────────

// LookupNode performs an iterative Kademlia node lookup and returns the k
// closest contacts to target that were found.
func (n *Node) LookupNode(target NodeID) []Contact {
	return n.iterativeLookup(target, false, "")
}

// ── Iterative FIND_VALUE ──────────────────────────────────────────────────────

// LookupValue searches the DHT for a value stored under key.
// Returns (value, true) if found, or ("", false) if not.
func (n *Node) LookupValue(key string) (string, bool) {
	keyID := NewNodeIDFromString(key)

	// Check local store first
	if v, ok := n.store.Get(key); ok {
		return v, true
	}

	closest := n.rt.FindClosest(keyID, K)
	if len(closest) == 0 {
		return "", false
	}

	queried := make(map[NodeID]bool)
	queried[n.self.ID] = true

	for i := 0; i < len(closest); i++ {
		c := closest[i]
		if queried[c.ID] {
			continue
		}
		queried[c.ID] = true
		n.rt.Update(c)

		resp, err := RPCFindValue(n.self, c, key)
		if err != nil {
			continue
		}
		n.rt.Update(resp.Sender)

		if resp.Found {
			return resp.Value, true
		}
		for _, nc := range resp.Closest {
			if !queried[nc.ID] {
				closest = append(closest, nc)
			}
		}
	}

	return "", false
}

// ── Store a value in the DHT ──────────────────────────────────────────────────

// StoreValue stores key→value on the k closest nodes to key.
func (n *Node) StoreValue(key, value string, ttl time.Duration) {
	// Always store locally
	n.store.Set(key, value, ttl)

	keyID := NewNodeIDFromString(key)
	closest := n.LookupNode(keyID)

	for _, c := range closest {
		if c.ID == n.self.ID {
			continue
		}
		go func(contact Contact) {
			if err := RPCStore(n.self, contact, key, value, ttl); err != nil {
				log.Printf("[DHT] store to %s failed: %v", contact.Address, err)
			}
		}(c)
	}
}

// ── Internal iterative lookup ─────────────────────────────────────────────────

func (n *Node) iterativeLookup(target NodeID, findValue bool, valueKey string) []Contact {
	type result struct {
		contact Contact
		done    bool
	}

	queried := make(map[NodeID]bool)
	queried[n.self.ID] = true

	shortlist := n.rt.FindClosest(target, K)
	if len(shortlist) == 0 {
		return nil
	}

	for {
		// Pick up to alpha un-queried contacts from the shortlist
		toQuery := []Contact{}
		for _, c := range shortlist {
			if !queried[c.ID] {
				toQuery = append(toQuery, c)
				if len(toQuery) == alpha {
					break
				}
			}
		}
		if len(toQuery) == 0 {
			break
		}

		type resp struct {
			from    Contact
			closest []Contact
		}
		ch := make(chan resp, len(toQuery))

		for _, c := range toQuery {
			queried[c.ID] = true
			go func(contact Contact) {
				r, err := RPCFindNode(n.self, contact, target)
				if err != nil {
					ch <- resp{}
					return
				}
				n.rt.Update(r.Sender)
				ch <- resp{from: r.Sender, closest: r.Closest}
			}(c)
		}

		improved := false
		for range toQuery {
			r := <-ch
			if r.closest == nil {
				continue
			}
			for _, nc := range r.closest {
				if !queried[nc.ID] {
					shortlist = append(shortlist, nc)
					improved = true
				}
			}
		}

		// Re-sort shortlist by distance to target
		sortByDistance(target, shortlist)
		if len(shortlist) > K {
			shortlist = shortlist[:K]
		}

		if !improved {
			break
		}
	}

	return shortlist
}

func sortByDistance(target NodeID, contacts []Contact) {
	// simple insertion sort (shortlist is small)
	for i := 1; i < len(contacts); i++ {
		for j := i; j > 0 && Closer(target, contacts[j].ID, contacts[j-1].ID); j-- {
			contacts[j], contacts[j-1] = contacts[j-1], contacts[j]
		}
	}
}

// ── HTTP handlers (inbound RPCs) ──────────────────────────────────────────────

func (n *Node) RegisterHandlers(mux *http.ServeMux) {
	mux.HandleFunc("/dht/ping", n.handlePing)
	mux.HandleFunc("/dht/find_node", n.handleFindNode)
	mux.HandleFunc("/dht/find_value", n.handleFindValue)
	mux.HandleFunc("/dht/store", n.handleStore)
	mux.HandleFunc("/dht/info", n.handleInfo)
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func (n *Node) handlePing(w http.ResponseWriter, r *http.Request) {
	var req PingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	n.rt.Update(req.Sender)
	writeJSON(w, PingResponse{Sender: n.self})
}

func (n *Node) handleFindNode(w http.ResponseWriter, r *http.Request) {
	var req FindNodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	n.rt.Update(req.Sender)

	target, err := NodeIDFromHex(req.Target)
	if err != nil {
		http.Error(w, "bad target id", http.StatusBadRequest)
		return
	}

	closest := n.rt.FindClosest(target, K)
	writeJSON(w, FindNodeResponse{Sender: n.self, Closest: closest})
}

func (n *Node) handleFindValue(w http.ResponseWriter, r *http.Request) {
	var req FindValueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	n.rt.Update(req.Sender)

	if v, ok := n.store.Get(req.Key); ok {
		writeJSON(w, FindValueResponse{Sender: n.self, Value: v, Found: true})
		return
	}

	keyID := NewNodeIDFromString(req.Key)
	closest := n.rt.FindClosest(keyID, K)
	writeJSON(w, FindValueResponse{Sender: n.self, Found: false, Closest: closest})
}

func (n *Node) handleStore(w http.ResponseWriter, r *http.Request) {
	var req StoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	n.rt.Update(req.Sender)

	ttl := time.Duration(req.TTL) * time.Second
	if ttl <= 0 {
		ttl = DefaultTTL
	}
	n.store.Set(req.Key, req.Value, ttl)
	writeJSON(w, StoreResponse{OK: true})
}

func (n *Node) handleInfo(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, map[string]interface{}{
		"id":      n.self.ID.Hex(),
		"address": n.self.Address,
		"peers":   n.rt.Size(),
		"keys":    len(n.store.Keys()),
	})
}

// ── Periodic republish ────────────────────────────────────────────────────────

// StartRepublish re-announces all locally stored keys every hour so they
// don't expire on remote nodes.
func (n *Node) StartRepublish() {
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			for _, key := range n.store.Keys() {
				if v, ok := n.store.Get(key); ok {
					n.StoreValue(key, v, DefaultTTL)
				}
			}
		}
	}()
}
