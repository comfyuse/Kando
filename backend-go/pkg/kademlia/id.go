package kademlia

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"math/bits"
)

const IDLen = 20 // 160 bits

type NodeID [IDLen]byte

func NewNodeIDFromString(s string) NodeID {
	h := sha256.Sum256([]byte(s))
	var id NodeID
	copy(id[:], h[:IDLen])
	return id
}

func RandomNodeID() NodeID {
	var id NodeID
	rand.Read(id[:])
	return id
}

func NodeIDFromHex(s string) (NodeID, error) {
	b, err := hex.DecodeString(s)
	if err != nil {
		return NodeID{}, err
	}
	var id NodeID
	copy(id[:], b)
	return id, nil
}

func (id NodeID) Hex() string {
	return hex.EncodeToString(id[:])
}

func (id NodeID) String() string {
	return id.Hex()[:16] + "..."
}

// XOR distance between two node IDs.
func Distance(a, b NodeID) NodeID {
	var d NodeID
	for i := range d {
		d[i] = a[i] ^ b[i]
	}
	return d
}

// Number of leading zero bits in the XOR distance — used to pick bucket index.
func CommonPrefixLen(a, b NodeID) int {
	d := Distance(a, b)
	for i, v := range d {
		if v != 0 {
			return i*8 + bits.LeadingZeros8(v)
		}
	}
	return IDLen * 8
}

// Less returns true if a is closer to target than b (XOR metric).
func Closer(target, a, b NodeID) bool {
	da := Distance(target, a)
	db := Distance(target, b)
	for i := range da {
		if da[i] < db[i] {
			return true
		}
		if da[i] > db[i] {
			return false
		}
	}
	return false
}

type Contact struct {
	ID      NodeID `json:"id"`
	Address string `json:"address"` // host:port of the DHT HTTP listener
}

func (c Contact) IDHex() string { return c.ID.Hex() }
