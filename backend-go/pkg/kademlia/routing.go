package kademlia

import "sort"

const numBuckets = IDLen * 8 // 160 buckets

// RoutingTable holds 160 k-buckets. Bucket i stores contacts whose node ID
// shares exactly i leading bits with the local node ID.
type RoutingTable struct {
	self    NodeID
	buckets [numBuckets]*kBucket
}

func NewRoutingTable(self NodeID) *RoutingTable {
	rt := &RoutingTable{self: self}
	for i := range rt.buckets {
		rt.buckets[i] = newKBucket()
	}
	return rt
}

// bucketIndex returns which bucket a contact belongs in.
func (rt *RoutingTable) bucketIndex(id NodeID) int {
	cpl := CommonPrefixLen(rt.self, id)
	if cpl >= numBuckets {
		cpl = numBuckets - 1
	}
	return cpl
}

// Update adds or refreshes a contact in the routing table.
func (rt *RoutingTable) Update(c Contact) {
	if c.ID == rt.self {
		return
	}
	rt.buckets[rt.bucketIndex(c.ID)].Update(c)
}

// Remove deletes a contact from the routing table.
func (rt *RoutingTable) Remove(id NodeID) {
	rt.buckets[rt.bucketIndex(id)].Remove(id)
}

// FindClosest returns up to count contacts closest to target by XOR distance.
func (rt *RoutingTable) FindClosest(target NodeID, count int) []Contact {
	var all []Contact
	for _, b := range rt.buckets {
		all = append(all, b.Peers()...)
	}

	sort.Slice(all, func(i, j int) bool {
		return Closer(target, all[i].ID, all[j].ID)
	})

	if len(all) > count {
		all = all[:count]
	}
	return all
}

// AllContacts returns every contact currently in the table.
func (rt *RoutingTable) AllContacts() []Contact {
	var all []Contact
	for _, b := range rt.buckets {
		all = append(all, b.Peers()...)
	}
	return all
}

// Size returns total number of contacts across all buckets.
func (rt *RoutingTable) Size() int {
	total := 0
	for _, b := range rt.buckets {
		total += b.Len()
	}
	return total
}
