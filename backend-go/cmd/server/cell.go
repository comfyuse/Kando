package main

// Key-based cell identity. A cell is identified by its PUBLIC key; the private
// key never reaches the backend. All durable cell state (identity, coordinate
// claim, neighbour approvals) lives as SIGNED records in the libp2p Kademlia
// DHT — see cell_dht.go. The handlers here verify signatures and read/write
// those DHT records. Stages are derived from approvals:
//
//   reserved → candidate (all 6 neighbours signed an approval) → citizen
//
// Identities are bootstrapped by an issuer (email/password account) who mints
// the queen at (0,0); the queen then mints her neighbours by invite.

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"
)

// ProfileEnvelope is an opaque, end-to-end-encrypted profile relayed to a
// neighbour for verification. The backend never sees the plaintext name.
// (Relay is in-memory for now; identity/approvals are the DHT-backed part.)
type ProfileEnvelope struct {
	From       string    `json:"from"`
	To         string    `json:"to"`
	Ciphertext string    `json:"ciphertext"`
	Created    time.Time `json:"created"`
}

type envelopeStore struct {
	mu sync.Mutex
	m  map[string][]ProfileEnvelope
}

var envelopes = &envelopeStore{m: make(map[string][]ProfileEnvelope)}

// ── P-256 crypto (interoperable with WebCrypto in the browser) ─────────────────

// genKeyPair mints a P-256 keypair: a base64 uncompressed-point public key (the
// identity) and a base64-encoded JWK private blob the holder imports. The
// backend keeps neither — both are returned once at mint/invite.
func genKeyPair() (pubB64, privBlob string, err error) {
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return "", "", err
	}
	pub := make([]byte, 65)
	pub[0] = 4
	priv.X.FillBytes(pub[1:33])
	priv.Y.FillBytes(pub[33:65])
	pubB64 = base64.StdEncoding.EncodeToString(pub)

	b64url := func(i *big.Int) string {
		b := make([]byte, 32)
		i.FillBytes(b)
		return base64.RawURLEncoding.EncodeToString(b)
	}
	jwk := map[string]string{
		"kty": "EC", "crv": "P-256",
		"x": b64url(priv.X), "y": b64url(priv.Y), "d": b64url(priv.D),
	}
	j, _ := json.Marshal(jwk)
	privBlob = base64.StdEncoding.EncodeToString(j)
	return pubB64, privBlob, nil
}

// verifySig checks a base64 raw ECDSA-P256 (r||s) signature over sha256(msg)
// against a base64 uncompressed-point public key.
func verifySig(pubB64, msg, sigB64 string) bool {
	pb, err := base64.StdEncoding.DecodeString(pubB64)
	if err != nil || len(pb) != 65 || pb[0] != 4 {
		return false
	}
	pub := &ecdsa.PublicKey{
		Curve: elliptic.P256(),
		X:     new(big.Int).SetBytes(pb[1:33]),
		Y:     new(big.Int).SetBytes(pb[33:65]),
	}
	sig, err := base64.StdEncoding.DecodeString(sigB64)
	if err != nil || len(sig) != 64 {
		return false
	}
	h := sha256.Sum256([]byte(msg))
	return ecdsa.Verify(pub, h[:], new(big.Int).SetBytes(sig[:32]), new(big.Int).SetBytes(sig[32:]))
}

func approveMessage(target string) string { return "kando-approve:" + target }
func inviteMessage(q, r int) string       { return "kando-invite:" + cellKey(q, r) }

// adjacent reports whether (q2,r2) is one of (q1,r1)'s 6 hex neighbours.
func adjacent(q1, r1, q2, r2 int) bool {
	for _, d := range hexDirs {
		if q1+d[0] == q2 && r1+d[1] == r2 {
			return true
		}
	}
	return false
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// currentIssuer returns the email of the authenticated issuer, if any.
func currentIssuer(req *http.Request) (string, bool) {
	token := bearerToken(req)
	if token == "" {
		return "", false
	}
	accountManager.mu.RLock()
	defer accountManager.mu.RUnlock()
	email, ok := accountManager.sessions[token]
	return email, ok
}

// mintCell generates a keypair and writes its signed cell + coord records to
// the DHT. Returns the public key and the one-time private blob.
func mintCell(q, r int) (pub, blob string, err error) {
	pub, blob, err = genKeyPair()
	if err != nil {
		return "", "", err
	}
	priv, err := privFromBlob(blob)
	if err != nil {
		return "", "", err
	}
	if err = putCellRec(pub, q, r, 0, priv); err != nil {
		return "", "", err
	}
	if err = putCoordRec(q, r, pub, 0, priv); err != nil {
		return "", "", err
	}
	return pub, blob, nil
}

// handleMintQueen mints the queen identity at (0,0). Issuer-only, once.
func handleMintQueen(w http.ResponseWriter, req *http.Request) {
	if _, ok := currentIssuer(req); !ok {
		authError(w, http.StatusUnauthorized, "Only a signed-in issuer can mint the queen.")
		return
	}
	if coordOwner(0, 0) != "" {
		authError(w, http.StatusConflict, "The queen cell (0,0) already exists.")
		return
	}
	pub, blob, err := mintCell(0, 0)
	if err != nil {
		authError(w, http.StatusInternalServerError, "Could not mint the queen: "+err.Error())
		return
	}
	writeJSON(w, map[string]interface{}{"publicKey": pub, "privateKey": blob, "q": 0, "r": 0, "status": "reserved"})
}

// handleCellLogin looks up a cell by public key. Status/coords are public.
func handleCellLogin(w http.ResponseWriter, req *http.Request) {
	var body struct {
		PublicKey string `json:"publicKey"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil || body.PublicKey == "" {
		authError(w, http.StatusBadRequest, "Invalid request.")
		return
	}
	c := getCellRec(body.PublicKey)
	if c == nil {
		authError(w, http.StatusNotFound, "No cell for this key.")
		return
	}
	writeJSON(w, map[string]interface{}{
		"publicKey":  c.Pub,
		"q":          c.Q,
		"r":          c.R,
		"status":     stageDHT(c.Pub, c.Q, c.R),
		"neighbours": neighboursDHT(c.Q, c.R, 0, c.Pub),
	})
}

// handleCellInvite mints a neighbour at an adjacent empty coordinate. The
// inviter signs "kando-invite:q,r" to prove they own the cell next door.
func handleCellInvite(w http.ResponseWriter, req *http.Request) {
	var body struct {
		Inviter string `json:"inviter"`
		Sig     string `json:"sig"`
		Q       int    `json:"q"`
		R       int    `json:"r"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		authError(w, http.StatusBadRequest, "Invalid request.")
		return
	}
	inv := getCellRec(body.Inviter)
	if inv == nil {
		authError(w, http.StatusNotFound, "Unknown inviter cell.")
		return
	}
	if !adjacent(inv.Q, inv.R, body.Q, body.R) {
		authError(w, http.StatusBadRequest, "That coordinate is not your neighbour.")
		return
	}
	if !verifySig(body.Inviter, inviteMessage(body.Q, body.R), body.Sig) {
		authError(w, http.StatusUnauthorized, "Invalid invite signature.")
		return
	}
	if coordOwner(body.Q, body.R) != "" {
		authError(w, http.StatusConflict, "That neighbour cell is already taken.")
		return
	}
	pub, blob, err := mintCell(body.Q, body.R)
	if err != nil {
		authError(w, http.StatusInternalServerError, "Could not mint neighbour: "+err.Error())
		return
	}
	writeJSON(w, map[string]interface{}{"publicKey": pub, "privateKey": blob, "q": body.Q, "r": body.R, "status": "reserved"})
}

// handleCellApprove records a neighbour's signed attestation in the DHT.
func handleCellApprove(w http.ResponseWriter, req *http.Request) {
	var body struct {
		Approver string `json:"approver"`
		Target   string `json:"target"`
		Sig      string `json:"sig"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		authError(w, http.StatusBadRequest, "Invalid request.")
		return
	}
	ac := getCellRec(body.Approver)
	tc := getCellRec(body.Target)
	if ac == nil || tc == nil {
		authError(w, http.StatusNotFound, "Unknown cell.")
		return
	}
	if !adjacent(tc.Q, tc.R, ac.Q, ac.R) {
		authError(w, http.StatusBadRequest, "You are not a neighbour of this cell.")
		return
	}
	if !verifySig(body.Approver, approveMessage(body.Target), body.Sig) {
		authError(w, http.StatusUnauthorized, "Invalid approval signature.")
		return
	}
	if err := putApprRec(body.Target, body.Approver, body.Sig); err != nil {
		authError(w, http.StatusInternalServerError, "Could not store approval: "+err.Error())
		return
	}
	nbrs := neighboursDHT(tc.Q, tc.R, 0, body.Target)
	approvals := 0
	for _, n := range nbrs {
		if a, _ := n["approved"].(bool); a {
			approvals++
		}
	}
	writeJSON(w, map[string]interface{}{"target": body.Target, "status": stageDHT(body.Target, tc.Q, tc.R), "approvals": approvals})
}

// handleSendProfile relays an opaque encrypted profile to a neighbour.
func handleSendProfile(w http.ResponseWriter, req *http.Request) {
	var body struct {
		From       string `json:"from"`
		To         string `json:"to"`
		Ciphertext string `json:"ciphertext"`
		Sig        string `json:"sig"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil || body.Ciphertext == "" {
		authError(w, http.StatusBadRequest, "Invalid request.")
		return
	}
	if getCellRec(body.From) == nil {
		authError(w, http.StatusNotFound, "Unknown sender cell.")
		return
	}
	if !verifySig(body.From, "kando-profile:"+body.To, body.Sig) {
		authError(w, http.StatusUnauthorized, "Invalid sender signature.")
		return
	}
	envelopes.mu.Lock()
	envelopes.m[body.To] = append(envelopes.m[body.To], ProfileEnvelope{From: body.From, To: body.To, Ciphertext: body.Ciphertext, Created: time.Now()})
	envelopes.mu.Unlock()
	writeJSON(w, map[string]interface{}{"status": "ok"})
}

// handleFetchProfiles returns pending encrypted envelopes for a recipient.
func handleFetchProfiles(w http.ResponseWriter, req *http.Request) {
	pk := req.URL.Query().Get("pubKey")
	envelopes.mu.Lock()
	out := envelopes.m[pk]
	envelopes.mu.Unlock()
	writeJSON(w, map[string]interface{}{"envelopes": out})
}

// registerCellRoutes wires the key-based cell endpoints.
func registerCellRoutes(r *mux.Router) {
	r.HandleFunc("/api/cell/mint-queen", handleMintQueen).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/cell/login", handleCellLogin).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/cell/invite", handleCellInvite).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/cell/approve", handleCellApprove).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/cell/profile", handleSendProfile).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/cell/profiles", handleFetchProfiles).Methods("GET", "OPTIONS")
}
