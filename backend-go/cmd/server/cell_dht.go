package main

// Real DHT storage for cell identities. Instead of an in-memory map, cells,
// coordinate claims, and neighbour approvals live as SIGNED records in the
// libp2p Kademlia DHT under the /kando/ namespace, replicated across every
// node that joins. A node never trusts a record it didn't verify: the
// kandoValidator below re-checks every signature on the way in and out.
//
//   /kando/cell/{sha256(pub)}        → who/where a cell is      (signed by owner)
//   /kando/coord/{q}_{r}             → which pub owns a coord   (signed by owner)
//   /kando/appr/{sha256(t)}_{sha256(a)} → a's approval of t     (signed by a)

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"
)

// ── Short-lived DHT read cache ───────────────────────────────────────────────
// Stage computation reads the same cell/coord/approval keys many times per
// request (the candidate/citizen checks overlap heavily). Without a cache a
// single login fires hundreds of DHT GetValues. A few-second cache collapses
// those into one read each and makes the 8s auto-refresh cheap. Writes update
// the cache so the writer sees its own changes immediately.
var dhtCache = struct {
	mu sync.Mutex
	m  map[string]struct {
		val []byte
		exp time.Time
	}
}{m: make(map[string]struct {
	val []byte
	exp time.Time
})}

const dhtCacheTTL = 5 * time.Second

func cachedGet(key string) ([]byte, error) {
	dhtCache.mu.Lock()
	if e, ok := dhtCache.m[key]; ok && time.Now().Before(e.exp) {
		v := e.val
		dhtCache.mu.Unlock()
		return v, nil
	}
	dhtCache.mu.Unlock()
	v, err := p2pNode.GetDHT(key)
	if err == nil {
		cachePut(key, v)
	}
	return v, err
}

func cachePut(key string, val []byte) {
	dhtCache.mu.Lock()
	dhtCache.m[key] = struct {
		val []byte
		exp time.Time
	}{val: val, exp: time.Now().Add(dhtCacheTTL)}
	dhtCache.mu.Unlock()
}

// ── Record shapes ──────────────────────────────────────────────────────────
type cellRec struct {
	Pub string `json:"pub"`
	Q   int    `json:"q"`
	R   int    `json:"r"`
	Seq int    `json:"seq"`
	Sig string `json:"sig"`
}
type coordRec struct {
	Pub string `json:"pub"`
	Q   int    `json:"q"`
	R   int    `json:"r"`
	Seq int    `json:"seq"`
	Sig string `json:"sig"`
}
type apprRec struct {
	Target   string `json:"target"`
	Approver string `json:"approver"`
	Sig      string `json:"sig"`
}

// profRec is a cell's PUBLIC display profile (just a name) — signed by the
// owner so others can see who a cell belongs to when they click it.
type profRec struct {
	Pub    string `json:"pub"`
	Name   string `json:"name"`
	Avatar string `json:"avatar,omitempty"` // small data-URL thumbnail (optional)
	Sig    string `json:"sig"`
}

func profMsg(name string) string { return "kando-pubprofile:" + name }
func profDHTKey(pub string) string { return "/kando/pub/" + pubHash(pub) }

func cellMsg(r cellRec) string  { return fmt.Sprintf("kando-cellrec:%s:%d,%d:%d", r.Pub, r.Q, r.R, r.Seq) }
func coordMsg(r coordRec) string {
	return fmt.Sprintf("kando-coordrec:%d,%d:%s:%d", r.Q, r.R, r.Pub, r.Seq)
}

// ── Key helpers (DHT keys are '/'-delimited; pubkeys are hashed to fit) ──────
func pubHash(pub string) string {
	b, _ := base64.StdEncoding.DecodeString(pub)
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}
func cellDHTKey(pub string) string    { return "/kando/cell/" + pubHash(pub) }
func coordDHTKey(q, r int) string     { return fmt.Sprintf("/kando/coord/%d_%d", q, r) }
func apprDHTKey(target, app string) string {
	return "/kando/appr/" + pubHash(target) + "_" + pubHash(app)
}

// ── Backend-side signing (used at mint/invite when we briefly hold the key) ──
func privFromBlob(blob string) (*ecdsa.PrivateKey, error) {
	raw, err := base64.StdEncoding.DecodeString(blob)
	if err != nil {
		return nil, err
	}
	var jwk struct{ D, X, Y string }
	if err := json.Unmarshal(raw, &jwk); err != nil {
		return nil, err
	}
	d, _ := base64.RawURLEncoding.DecodeString(jwk.D)
	x, _ := base64.RawURLEncoding.DecodeString(jwk.X)
	y, _ := base64.RawURLEncoding.DecodeString(jwk.Y)
	priv := new(ecdsa.PrivateKey)
	priv.Curve = elliptic.P256()
	priv.D = new(big.Int).SetBytes(d)
	priv.X = new(big.Int).SetBytes(x)
	priv.Y = new(big.Int).SetBytes(y)
	return priv, nil
}
func signWithPriv(priv *ecdsa.PrivateKey, msg string) string {
	h := sha256.Sum256([]byte(msg))
	r, s, err := ecdsa.Sign(rand.Reader, priv, h[:])
	if err != nil {
		return ""
	}
	sig := make([]byte, 64)
	r.FillBytes(sig[:32])
	s.FillBytes(sig[32:])
	return base64.StdEncoding.EncodeToString(sig)
}

// ── The DHT record validator (runs on every Put and Get) ─────────────────────
type kandoValidator struct{}

func (kandoValidator) Validate(key string, value []byte) error {
	p := strings.Split(key, "/")
	if len(p) < 4 || p[1] != "kando" {
		return errors.New("not a kando key")
	}
	switch p[2] {
	case "cell":
		var r cellRec
		if json.Unmarshal(value, &r) != nil {
			return errors.New("bad cell json")
		}
		if pubHash(r.Pub) != p[3] || !verifySig(r.Pub, cellMsg(r), r.Sig) {
			return errors.New("bad cell record")
		}
	case "coord":
		var r coordRec
		if json.Unmarshal(value, &r) != nil {
			return errors.New("bad coord json")
		}
		if fmt.Sprintf("%d_%d", r.Q, r.R) != p[3] || !verifySig(r.Pub, coordMsg(r), r.Sig) {
			return errors.New("bad coord record")
		}
	case "appr":
		var r apprRec
		if json.Unmarshal(value, &r) != nil {
			return errors.New("bad appr json")
		}
		if pubHash(r.Target)+"_"+pubHash(r.Approver) != p[3] || !verifySig(r.Approver, approveMessage(r.Target), r.Sig) {
			return errors.New("bad appr record")
		}
	case "pub":
		var r profRec
		if json.Unmarshal(value, &r) != nil {
			return errors.New("bad pub json")
		}
		if pubHash(r.Pub) != p[3] || !verifySig(r.Pub, profMsg(r.Name), r.Sig) {
			return errors.New("bad pub record")
		}
	default:
		return errors.New("unknown record type")
	}
	return nil
}

// Select resolves conflicts: highest seq wins for cell/coord; first valid for appr.
func (kandoValidator) Select(key string, vals [][]byte) (int, error) {
	best, bestSeq := 0, -1
	for i, v := range vals {
		seq := 0
		var r struct {
			Seq int `json:"seq"`
		}
		if json.Unmarshal(v, &r) == nil {
			seq = r.Seq
		}
		if seq > bestSeq {
			bestSeq, best = seq, i
		}
	}
	return best, nil
}

// ── Storage helpers (these are the ONLY way cell state is read/written now) ──
func putCellRec(pub string, q, r, seq int, priv *ecdsa.PrivateKey) error {
	rec := cellRec{Pub: pub, Q: q, R: r, Seq: seq}
	rec.Sig = signWithPriv(priv, cellMsg(rec))
	b, _ := json.Marshal(rec)
	key := cellDHTKey(pub)
	if err := p2pNode.PutDHT(key, b); err != nil {
		return err
	}
	cachePut(key, b)
	return nil
}
func putCoordRec(q, r int, pub string, seq int, priv *ecdsa.PrivateKey) error {
	rec := coordRec{Pub: pub, Q: q, R: r, Seq: seq}
	rec.Sig = signWithPriv(priv, coordMsg(rec))
	b, _ := json.Marshal(rec)
	key := coordDHTKey(q, r)
	if err := p2pNode.PutDHT(key, b); err != nil {
		return err
	}
	cachePut(key, b)
	return nil
}
func putApprRec(target, approver, sig string) error {
	rec := apprRec{Target: target, Approver: approver, Sig: sig}
	b, _ := json.Marshal(rec)
	key := apprDHTKey(target, approver)
	if err := p2pNode.PutDHT(key, b); err != nil {
		return err
	}
	cachePut(key, b)
	return nil
}

func getCellRec(pub string) *cellRec {
	v, err := cachedGet(cellDHTKey(pub))
	if err != nil || v == nil {
		return nil
	}
	var r cellRec
	if json.Unmarshal(v, &r) != nil {
		return nil
	}
	return &r
}
func coordOwner(q, r int) string {
	if rec := coordRecord(q, r); rec != nil {
		return rec.Pub
	}
	return ""
}
func coordRecord(q, r int) *coordRec {
	v, err := cachedGet(coordDHTKey(q, r))
	if err != nil || v == nil {
		return nil
	}
	var rec coordRec
	if json.Unmarshal(v, &rec) != nil {
		return nil
	}
	return &rec
}
func hasApprovalDHT(approver, target string) bool {
	v, err := cachedGet(apprDHTKey(target, approver))
	return err == nil && v != nil
}
func putProfRec(pub, name, avatar, sig string) error {
	b, _ := json.Marshal(profRec{Pub: pub, Name: name, Avatar: avatar, Sig: sig})
	key := profDHTKey(pub)
	if err := p2pNode.PutDHT(key, b); err != nil {
		return err
	}
	cachePut(key, b)
	return nil
}
func getProf(pub string) *profRec {
	v, err := cachedGet(profDHTKey(pub))
	if err != nil || v == nil {
		return nil
	}
	var r profRec
	if json.Unmarshal(v, &r) != nil {
		return nil
	}
	return &r
}

// ── Stage computation over the DHT ──────────────────────────────────────────
// candidateOrHigher: all 6 neighbour coords are occupied AND each has approved.
func candidateOrHigherDHT(q, r, _seq int, pub string) bool {
	for _, d := range hexDirs {
		owner := coordOwner(q+d[0], r+d[1])
		if owner == "" || !hasApprovalDHT(owner, pub) {
			return false
		}
	}
	return true
}
func stageDHT(pub string, q, r int) string {
	if !candidateOrHigherDHT(q, r, 0, pub) {
		return "reserved"
	}
	for _, d := range hexDirs {
		owner := coordOwner(q+d[0], r+d[1])
		if !candidateOrHigherDHT(q+d[0], r+d[1], 0, owner) {
			return "candidate"
		}
	}
	return "citizen"
}

// approvalCount returns how many of the cell's 6 neighbours have approved it.
func approvalCount(pub string, q, r int) int {
	c := 0
	for _, d := range hexDirs {
		if owner := coordOwner(q+d[0], r+d[1]); owner != "" && hasApprovalDHT(owner, pub) {
			c++
		}
	}
	return c
}

// neighboursDHT returns the 6 surrounding coords with occupant + approval state.
func neighboursDHT(q, r, _seq int, pub string) []map[string]interface{} {
	out := make([]map[string]interface{}, 0, 6)
	for _, d := range hexDirs {
		nq, nr := q+d[0], r+d[1]
		entry := map[string]interface{}{"q": nq, "r": nr, "occupied": false}
		if owner := coordOwner(nq, nr); owner != "" {
			nc := getCellRec(owner)
			entry["occupied"] = true
			entry["pubKey"] = owner
			if nc != nil {
				entry["status"] = stageDHT(owner, nc.Q, nc.R)
				entry["approvals"] = approvalCount(owner, nc.Q, nc.R)
			}
			entry["approved"] = hasApprovalDHT(owner, pub)
		}
		out = append(out, entry)
	}
	return out
}
