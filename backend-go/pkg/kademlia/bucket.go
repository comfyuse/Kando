package kademlia

import "sync"

const K = 20 // bucket size (standard Kademlia value)

// kBucket holds up to K contacts ordered from least-recently seen (front)
// to most-recently seen (back).
type kBucket struct {
	mu       sync.Mutex
	contacts []Contact
}

func newKBucket() *kBucket {
	return &kBucket{contacts: make([]Contact, 0, K)}
}

// Update inserts or moves the contact to the back (most-recently seen).
// If the bucket is full the least-recently seen contact (front) is dropped.
func (b *kBucket) Update(c Contact) {
	b.mu.Lock()
	defer b.mu.Unlock()

	for i, existing := range b.contacts {
		if existing.ID == c.ID {
			// Move to back
			b.contacts = append(b.contacts[:i], b.contacts[i+1:]...)
			b.contacts = append(b.contacts, c)
			return
		}
	}

	if len(b.contacts) < K {
		b.contacts = append(b.contacts, c)
		return
	}

	// Bucket full — evict least-recently seen (index 0)
	b.contacts = append(b.contacts[1:], c)
}

func (b *kBucket) Remove(id NodeID) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for i, c := range b.contacts {
		if c.ID == id {
			b.contacts = append(b.contacts[:i], b.contacts[i+1:]...)
			return
		}
	}
}

func (b *kBucket) Contains(id NodeID) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, c := range b.contacts {
		if c.ID == id {
			return true
		}
	}
	return false
}

func (b *kBucket) Peers() []Contact {
	b.mu.Lock()
	defer b.mu.Unlock()
	out := make([]Contact, len(b.contacts))
	copy(out, b.contacts)
	return out
}

func (b *kBucket) Len() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.contacts)
}
