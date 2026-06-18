// Package p2p wraps a libp2p host with Kademlia DHT (server mode) and
// GossipSub for fully decentralised peer discovery and messaging.
//
// Architecture:
//   - Each backend process is a libp2p Node.
//   - Nodes find each other via Kademlia DHT (go-libp2p-kad-dht).
//   - Chat messages and member announcements are broadcast with GossipSub.
//   - The HTTP/WebSocket layer in cmd/server/main.go acts as a bridge for
//     browser clients; the actual P2P network lives here.
package p2p

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	leveldb "github.com/ipfs/go-ds-leveldb"
	libp2p "github.com/libp2p/go-libp2p"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	kbucket "github.com/libp2p/go-libp2p-kbucket"
	record "github.com/libp2p/go-libp2p-record"
	pubsub "github.com/libp2p/go-libp2p-pubsub"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/routing"
	"github.com/multiformats/go-multiaddr"
)

const (
	TopicChat    = "kando/chat/v1"
	TopicMembers = "kando/members/v1"
)

// ChatMessage is the wire format for a P2P chat message.
type ChatMessage struct {
	ID        string    `json:"id"`
	From      string    `json:"from"`
	FromName  string    `json:"fromName"`
	To        string    `json:"to"`
	Content   string    `json:"content"`
	Room      string    `json:"room"`
	Timestamp time.Time `json:"timestamp"`
}

// MemberAnnounce is published whenever a member joins, updates, or leaves.
// Other nodes receive this and update their local peer store accordingly.
type MemberAnnounce struct {
	Op     string    `json:"op"` // "join" | "update" | "leave"
	PeerID string    `json:"peerId"`
	Name   string    `json:"name"`
	DHTId  string    `json:"dhtId"`
	CellQ  int       `json:"cellQ"`
	CellR  int       `json:"cellR"`
	PubKey string    `json:"pubKey,omitempty"`
	Seen   time.Time `json:"seen"`
}

// Node is a libp2p node with Kademlia DHT routing and GossipSub messaging.
type Node struct {
	h    host.Host
	kDHT *dht.IpfsDHT
	ps   *pubsub.PubSub

	ctx    context.Context
	cancel context.CancelFunc

	chatTopic   *pubsub.Topic
	memberTopic *pubsub.Topic
	chatSub     *pubsub.Subscription
	memberSub   *pubsub.Subscription

	mu             sync.RWMutex
	chatHandlers   []func(ChatMessage)
	memberHandlers []func(MemberAnnounce)
}

// New starts a libp2p node listening on tcpPort (TCP) and the same port for
// QUIC-v1. The Kademlia DHT is started in server mode so this node can
// answer routing queries from other nodes.
func New(parent context.Context, tcpPort int, validator record.Validator, dataDir string) (*Node, error) {
	ctx, cancel := context.WithCancel(parent)

	h, err := libp2p.New(
		libp2p.ListenAddrStrings(
			fmt.Sprintf("/ip4/0.0.0.0/tcp/%d", tcpPort),
			fmt.Sprintf("/ip4/0.0.0.0/udp/%d/quic-v1", tcpPort),
		),
		libp2p.NATPortMap(),
	)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("libp2p host: %w", err)
	}

	// Kademlia DHT — server mode so this node serves routing queries. The
	// "kando" namespace validator makes cell records first-class signed DHT
	// values (PutValue/GetValue under /kando/...).
	dhtOpts := []dht.Option{
		dht.Mode(dht.ModeServer),
		dht.BootstrapPeers(), // start with no IPFS bootstrap nodes — use BOOTSTRAP_PEERS env
	}
	if validator != nil {
		// A private "/kando" DHT (its own protocol prefix) so we can register
		// just our namespace validator without the /ipfs /pk+/ipns requirement,
		// and so Kando nodes only ever talk to other Kando nodes.
		dhtOpts = append(dhtOpts,
			dht.ProtocolPrefix("/kando"),
			dht.NamespacedValidator("kando", validator),
		)
		// Persist DHT records to disk so a restart doesn't wipe the hive.
		if dataDir != "" {
			ds, derr := leveldb.NewDatastore(dataDir, nil)
			if derr != nil {
				h.Close()
				cancel()
				return nil, fmt.Errorf("dht datastore: %w", derr)
			}
			dhtOpts = append(dhtOpts, dht.Datastore(ds))
		}
	}
	kd, err := dht.New(ctx, h, dhtOpts...)
	if err != nil {
		h.Close()
		cancel()
		return nil, fmt.Errorf("kad-dht: %w", err)
	}
	if err := kd.Bootstrap(ctx); err != nil {
		log.Printf("[DHT] bootstrap: %v", err)
	}

	// GossipSub for chat and member-sync topics.
	gs, err := pubsub.NewGossipSub(ctx, h)
	if err != nil {
		h.Close()
		cancel()
		return nil, fmt.Errorf("gossipsub: %w", err)
	}

	chatT, chatS, err := joinAndSubscribe(gs, TopicChat)
	if err != nil {
		h.Close()
		cancel()
		return nil, err
	}

	memT, memS, err := joinAndSubscribe(gs, TopicMembers)
	if err != nil {
		h.Close()
		cancel()
		return nil, err
	}

	n := &Node{
		h: h, kDHT: kd, ps: gs,
		ctx: ctx, cancel: cancel,
		chatTopic: chatT, memberTopic: memT,
		chatSub: chatS, memberSub: memS,
	}

	go n.readLoop(chatS, func(data []byte) {
		var cm ChatMessage
		if json.Unmarshal(data, &cm) != nil {
			return
		}
		n.mu.RLock()
		for _, fn := range n.chatHandlers {
			fn(cm)
		}
		n.mu.RUnlock()
	})

	go n.readLoop(memS, func(data []byte) {
		var ma MemberAnnounce
		if json.Unmarshal(data, &ma) != nil {
			return
		}
		n.mu.RLock()
		for _, fn := range n.memberHandlers {
			fn(ma)
		}
		n.mu.RUnlock()
	})

	return n, nil
}

// PutDHT stores a signed record under a /kando/... key in the Kademlia DHT.
// With peers present it replicates to the closest nodes; on a lone node it
// still stores locally and propagates once peers join.
func (n *Node) PutDHT(key string, value []byte) error {
	ctx, cancel := context.WithTimeout(n.ctx, 20*time.Second)
	defer cancel()
	err := n.kDHT.PutValue(ctx, key, value)
	// On a lone node the record is stored locally but PutValue reports it could
	// not find peers to replicate to. That's fine — it propagates once peers
	// join — so treat an empty routing table as success.
	if errors.Is(err, kbucket.ErrLookupFailure) {
		return nil
	}
	return err
}

// GetDHT fetches a record by its /kando/... key from the DHT (local + network).
// Returns (nil, nil) when the key is absent rather than an error.
func (n *Node) GetDHT(key string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(n.ctx, 20*time.Second)
	defer cancel()
	v, err := n.kDHT.GetValue(ctx, key)
	if err == routing.ErrNotFound {
		return nil, nil
	}
	return v, err
}

// RoutingTableSize reports how many peers this node's DHT routing table holds.
func (n *Node) RoutingTableSize() int {
	return n.kDHT.RoutingTable().Size()
}

func joinAndSubscribe(gs *pubsub.PubSub, topic string) (*pubsub.Topic, *pubsub.Subscription, error) {
	t, err := gs.Join(topic)
	if err != nil {
		return nil, nil, fmt.Errorf("join %s: %w", topic, err)
	}
	s, err := t.Subscribe()
	if err != nil {
		return nil, nil, fmt.Errorf("subscribe %s: %w", topic, err)
	}
	return t, s, nil
}

func (n *Node) readLoop(sub *pubsub.Subscription, handle func([]byte)) {
	for {
		msg, err := sub.Next(n.ctx)
		if err != nil {
			return
		}
		// Skip messages published by this node.
		if msg.ReceivedFrom == n.h.ID() {
			continue
		}
		handle(msg.Data)
	}
}

// Connect dials one or more bootstrap peers using their full libp2p multiaddrs,
// e.g. /ip4/1.2.3.4/tcp/9000/p2p/QmPeerID…
// After connecting, the DHT is re-bootstrapped so routing tables fill in.
func (n *Node) Connect(addrs []string) {
	for _, addr := range addrs {
		addr = trimSpace(addr)
		if addr == "" {
			continue
		}
		ma, err := multiaddr.NewMultiaddr(addr)
		if err != nil {
			log.Printf("[P2P] bad multiaddr %q: %v", addr, err)
			continue
		}
		pi, err := peer.AddrInfoFromP2pAddr(ma)
		if err != nil {
			log.Printf("[P2P] addr info %q: %v", addr, err)
			continue
		}
		if err := n.h.Connect(n.ctx, *pi); err != nil {
			log.Printf("[P2P] connect %s: %v", pi.ID, err)
		} else {
			log.Printf("[P2P] ✅ connected to %s", pi.ID)
			go n.kDHT.Bootstrap(n.ctx)
		}
	}
}

// PublishChat broadcasts a chat message to all nodes subscribed to the chat topic.
func (n *Node) PublishChat(msg ChatMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	return n.chatTopic.Publish(n.ctx, data)
}

// AnnounceMember broadcasts a member join/update/leave to all nodes.
func (n *Node) AnnounceMember(ma MemberAnnounce) error {
	data, err := json.Marshal(ma)
	if err != nil {
		return err
	}
	return n.memberTopic.Publish(n.ctx, data)
}

// OnChat registers a handler called for every chat message received from a remote node.
func (n *Node) OnChat(fn func(ChatMessage)) {
	n.mu.Lock()
	n.chatHandlers = append(n.chatHandlers, fn)
	n.mu.Unlock()
}

// OnMember registers a handler called for every member announcement from a remote node.
func (n *Node) OnMember(fn func(MemberAnnounce)) {
	n.mu.Lock()
	n.memberHandlers = append(n.memberHandlers, fn)
	n.mu.Unlock()
}

// PeerID returns this node's libp2p peer ID.
func (n *Node) PeerID() string { return n.h.ID().String() }

// Addrs returns all multiaddrs this node is advertising (with /p2p/ suffix).
func (n *Node) Addrs() []string {
	out := make([]string, 0, len(n.h.Addrs()))
	for _, a := range n.h.Addrs() {
		out = append(out, fmt.Sprintf("%s/p2p/%s", a, n.h.ID()))
	}
	return out
}

// ConnectedPeers returns peer IDs of all directly connected libp2p peers.
func (n *Node) ConnectedPeers() []string {
	peers := n.h.Network().Peers()
	ids := make([]string, len(peers))
	for i, p := range peers {
		ids[i] = p.String()
	}
	return ids
}

// DHTSize returns the number of peers currently in the Kademlia routing table.
func (n *Node) DHTSize() int {
	return len(n.h.Network().Peers())
}

// Close shuts down the libp2p host and all associated goroutines.
func (n *Node) Close() {
	n.cancel()
	n.h.Close()
}

func trimSpace(s string) string {
	out := []byte(s)
	start, end := 0, len(out)
	for start < end && (out[start] == ' ' || out[start] == '\t' || out[start] == '\n' || out[start] == '\r') {
		start++
	}
	for end > start && (out[end-1] == ' ' || out[end-1] == '\t' || out[end-1] == '\n' || out[end-1] == '\r') {
		end--
	}
	return string(out[start:end])
}
