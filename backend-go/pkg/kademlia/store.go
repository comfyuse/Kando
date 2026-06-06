package kademlia

import (
	"sync"
	"time"
)

type storeEntry struct {
	value     string
	expiresAt time.Time
}

// Store is a local key-value store used by the DHT node to hold values it is
// responsible for. Keys and values are strings; entries expire after TTL.
type Store struct {
	mu      sync.RWMutex
	entries map[string]storeEntry
}

const DefaultTTL = 24 * time.Hour

func NewStore() *Store {
	s := &Store{entries: make(map[string]storeEntry)}
	go s.gcLoop()
	return s
}

func (s *Store) Set(key, value string, ttl time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries[key] = storeEntry{value: value, expiresAt: time.Now().Add(ttl)}
}

func (s *Store) Get(key string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.entries[key]
	if !ok || time.Now().After(e.expiresAt) {
		return "", false
	}
	return e.value, true
}

func (s *Store) Delete(key string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.entries, key)
}

func (s *Store) Keys() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	keys := make([]string, 0, len(s.entries))
	for k, e := range s.entries {
		if time.Now().Before(e.expiresAt) {
			keys = append(keys, k)
		}
	}
	return keys
}

func (s *Store) gcLoop() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		s.cleanup()
	}
}

func (s *Store) cleanup() {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, e := range s.entries {
		if now.After(e.expiresAt) {
			delete(s.entries, k)
		}
	}
}
