package kademlia

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const rpcTimeout = 5 * time.Second

// ── Request / Response types ──────────────────────────────────────────────────

type PingRequest struct {
	Sender Contact `json:"sender"`
}

type PingResponse struct {
	Sender Contact `json:"sender"`
}

type FindNodeRequest struct {
	Sender Contact `json:"sender"`
	Target string  `json:"target"` // hex NodeID
}

type FindNodeResponse struct {
	Sender  Contact   `json:"sender"`
	Closest []Contact `json:"closest"`
}

type FindValueRequest struct {
	Sender Contact `json:"sender"`
	Key    string  `json:"key"` // hex NodeID derived from the actual key
}

type FindValueResponse struct {
	Sender  Contact   `json:"sender"`
	Value   string    `json:"value,omitempty"`
	Found   bool      `json:"found"`
	Closest []Contact `json:"closest,omitempty"`
}

type StoreRequest struct {
	Sender Contact `json:"sender"`
	Key    string  `json:"key"`
	Value  string  `json:"value"`
	TTL    int64   `json:"ttl"` // seconds
}

type StoreResponse struct {
	OK bool `json:"ok"`
}

// ── HTTP RPC client helpers ───────────────────────────────────────────────────

func rpcPost(addr, path string, req, resp interface{}) error {
	body, err := json.Marshal(req)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
	defer cancel()

	url := fmt.Sprintf("http://%s%s", addr, path)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	httpResp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return err
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode != http.StatusOK {
		return fmt.Errorf("rpc %s returned %d", path, httpResp.StatusCode)
	}

	return json.NewDecoder(httpResp.Body).Decode(resp)
}

// ── Outbound RPC calls ────────────────────────────────────────────────────────

func RPCPing(self Contact, target Contact) (*PingResponse, error) {
	req := PingRequest{Sender: self}
	var resp PingResponse
	if err := rpcPost(target.Address, "/dht/ping", req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func RPCFindNode(self Contact, target Contact, id NodeID) (*FindNodeResponse, error) {
	req := FindNodeRequest{Sender: self, Target: id.Hex()}
	var resp FindNodeResponse
	if err := rpcPost(target.Address, "/dht/find_node", req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func RPCFindValue(self Contact, target Contact, key string) (*FindValueResponse, error) {
	req := FindValueRequest{Sender: self, Key: key}
	var resp FindValueResponse
	if err := rpcPost(target.Address, "/dht/find_value", req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func RPCStore(self Contact, target Contact, key, value string, ttl time.Duration) error {
	req := StoreRequest{
		Sender: self,
		Key:    key,
		Value:  value,
		TTL:    int64(ttl.Seconds()),
	}
	var resp StoreResponse
	if err := rpcPost(target.Address, "/dht/store", req, &resp); err != nil {
		return err
	}
	if !resp.OK {
		return fmt.Errorf("remote store returned not-ok")
	}
	return nil
}
