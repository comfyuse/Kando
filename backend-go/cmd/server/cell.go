package main

// Key-based cell identity (the new decentralised model).
//
// A cell is identified by its PUBLIC key. The private key never reaches the
// backend — it lives only on the holder's device and is used there to sign
// approvals and derive ECDH secrets. The backend stores, per public key, the
// cell's coordinate and derives its stage purely from neighbour occupancy +
// cryptographic approvals (NOT from a trusted server flag):
//
//   reserved  — holds a coordinate, not yet verified by its 6 neighbours
//   candidate — all 6 neighbour cells exist AND each has signed an approval
//   citizen   — all 6 neighbours are themselves candidate-or-higher
//
// Identities are bootstrapped by an issuer (an email/password account) who
// mints the queen at (0,0); the queen then mints her neighbours by invite.

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/mux"
)

// Cell is one key-based identity pinned to a hex coordinate.
type Cell struct {
	PubKey  string    `json:"pubKey"` // base64 uncompressed P-256 point — the identity
	Q       int       `json:"q"`
	R       int       `json:"r"`
	Created time.Time `json:"created"`
}

// Approval is a neighbour's signed attestation of a target cell's identity.
// Sig is base64 raw ECDSA-P256 (r||s) over sha256("kando-approve:"+target).
type Approval struct {
	Approver string    `json:"approver"` // neighbour pubKey (signer)
	Target   string    `json:"target"`   // pubKey being approved
	Sig      string    `json:"sig"`
	Created  time.Time `json:"created"`
}

// ProfileEnvelope is an opaque, end-to-end-encrypted profile relayed from one
// cell to a neighbour. The backend never sees the plaintext (name).
type ProfileEnvelope struct {
	From       string    `json:"from"`
	To         string    `json:"to"`
	Ciphertext string    `json:"ciphertext"`
	Created    time.Time `json:"created"`
}

type CellManager struct {
	mu        sync.RWMutex
	cells     map[string]*Cell                 // pubKey → cell
	coord     map[string]string                // "q,r" → pubKey
	approvals map[string]map[string]Approval   // target → approver → approval
	envelopes map[string][]ProfileEnvelope     // recipient pubKey → pending envelopes
}

var cellManager = &CellManager{
	cells:     make(map[string]*Cell),
	coord:     make(map[string]string),
	approvals: make(map[string]map[string]Approval),
	envelopes: make(map[string][]ProfileEnvelope),
}

var cellsFile = func() string {
	if f := os.Getenv("CELLS_FILE"); f != "" {
		return f
	}
	return "kando-cells.json"
}()

// ── Persistence ───────────────────────────────────────────────────────────────

type cellsState struct {
	Cells     map[string]*Cell               `json:"cells"`
	Approvals map[string]map[string]Approval `json:"approvals"`
}

func loadCells() {
	data, err := os.ReadFile(cellsFile)
	if err != nil {
		return
	}
	var st cellsState
	if err := json.Unmarshal(data, &st); err != nil {
		return
	}
	cellManager.mu.Lock()
	defer cellManager.mu.Unlock()
	if st.Cells != nil {
		cellManager.cells = st.Cells
		for pk, c := range st.Cells {
			cellManager.coord[cellKey(c.Q, c.R)] = pk
		}
	}
	if st.Approvals != nil {
		cellManager.approvals = st.Approvals
	}
}

// saveCellsLocked persists cells + approvals. Caller holds cellManager.mu.
func saveCellsLocked() {
	st := cellsState{Cells: cellManager.cells, Approvals: cellManager.approvals}
	data, err := json.MarshalIndent(st, "", "  ")
	if err != nil {
		return
	}
	tmp := cellsFile + ".tmp"
	if err := os.WriteFile(tmp, data, 0o600); err != nil {
		return
	}
	os.Rename(tmp, cellsFile)
}

// ── P-256 crypto (interoperable with WebCrypto in the browser) ─────────────────

// genKeyPair mints a P-256 keypair. The public key is returned as a base64
// uncompressed point (the identity); the private key as a base64-encoded JWK
// blob the holder imports in the browser. The backend keeps NEITHER private
// key on disk — it is returned once and handed to the holder.
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
	r := new(big.Int).SetBytes(sig[:32])
	s := new(big.Int).SetBytes(sig[32:])
	return ecdsa.Verify(pub, h[:], r, s)
}

// approveMessage is the exact string a neighbour signs to approve a target.
func approveMessage(target string) string { return "kando-approve:" + target }

// ── Stage computation (verification-based) ─────────────────────────────────────

// hasApprovalLocked reports whether approver has approved target. Caller holds mu.
func (m *CellManager) hasApprovalLocked(approver, target string) bool {
	if byTarget, ok := m.approvals[target]; ok {
		_, ok := byTarget[approver]
		return ok
	}
	return false
}

// candidateOrHigherLocked: all 6 neighbours exist and have approved c. This is
// the non-recursive core used by both the candidate and citizen checks.
func (m *CellManager) candidateOrHigherLocked(c *Cell) bool {
	for _, d := range hexDirs {
		pk, ok := m.coord[cellKey(c.Q+d[0], c.R+d[1])]
		if !ok || !m.hasApprovalLocked(pk, c.PubKey) {
			return false
		}
	}
	return true
}

// stageLocked derives a cell's stage. Caller holds mu (read).
func (m *CellManager) stageLocked(c *Cell) string {
	if !m.candidateOrHigherLocked(c) {
		return "reserved"
	}
	for _, d := range hexDirs {
		pk := m.coord[cellKey(c.Q+d[0], c.R+d[1])]
		if !m.candidateOrHigherLocked(m.cells[pk]) {
			return "candidate"
		}
	}
	return "citizen"
}

// neighboursLocked returns the 6 surrounding coords with their occupant (if any).
func (m *CellManager) neighboursLocked(c *Cell) []map[string]interface{} {
	out := make([]map[string]interface{}, 0, 6)
	for _, d := range hexDirs {
		q, r := c.Q+d[0], c.R+d[1]
		entry := map[string]interface{}{"q": q, "r": r, "occupied": false}
		if pk, ok := m.coord[cellKey(q, r)]; ok {
			nc := m.cells[pk]
			entry["occupied"] = true
			entry["pubKey"] = pk
			entry["status"] = m.stageLocked(nc)
			entry["approved"] = m.hasApprovalLocked(pk, c.PubKey) // has this neighbour approved me?
		}
		out = append(out, entry)
	}
	return out
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

// handleMintQueen mints the queen identity at (0,0). Issuer-only, once.
func handleMintQueen(w http.ResponseWriter, req *http.Request) {
	if _, ok := currentIssuer(req); !ok {
		authError(w, http.StatusUnauthorized, "Only a signed-in issuer can mint the queen.")
		return
	}
	cellManager.mu.Lock()
	defer cellManager.mu.Unlock()

	if _, taken := cellManager.coord[cellKey(0, 0)]; taken {
		authError(w, http.StatusConflict, "The queen cell (0,0) already exists.")
		return
	}
	pub, priv, err := genKeyPair()
	if err != nil {
		authError(w, http.StatusInternalServerError, "Could not generate the queen's keys.")
		return
	}
	cell := &Cell{PubKey: pub, Q: 0, R: 0, Created: time.Now()}
	cellManager.cells[pub] = cell
	cellManager.coord[cellKey(0, 0)] = pub
	saveCellsLocked()

	// privateKey is returned ONCE, for the issuer to hand to the queen.
	writeJSON(w, map[string]interface{}{
		"publicKey":  pub,
		"privateKey": priv,
		"q":          0,
		"r":          0,
		"status":     "reserved",
	})
}

// handleCellLogin looks up a cell by its public key. No secret required —
// status/coords are public; the private key proves ownership only for actions.
func handleCellLogin(w http.ResponseWriter, req *http.Request) {
	var body struct {
		PublicKey string `json:"publicKey"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil || body.PublicKey == "" {
		authError(w, http.StatusBadRequest, "Invalid request.")
		return
	}
	cellManager.mu.RLock()
	defer cellManager.mu.RUnlock()

	c, ok := cellManager.cells[body.PublicKey]
	if !ok {
		authError(w, http.StatusNotFound, "No cell for this key.")
		return
	}
	writeJSON(w, map[string]interface{}{
		"publicKey":  c.PubKey,
		"q":          c.Q,
		"r":          c.R,
		"status":     cellManager.stageLocked(c),
		"neighbours": cellManager.neighboursLocked(c),
	})
}

// inviteMessage is signed by an inviter to mint a neighbour at (q,r).
func inviteMessage(q, r int) string { return "kando-invite:" + cellKey(q, r) }

// neighbourCoord reports whether (q,r) is one of c's 6 direct neighbours.
func neighbourCoord(c *Cell, q, r int) bool {
	for _, d := range hexDirs {
		if c.Q+d[0] == q && c.R+d[1] == r {
			return true
		}
	}
	return false
}

// handleCellInvite mints a NEW neighbour key at an adjacent empty coordinate.
// The inviter signs "kando-invite:q,r" with their private key to prove they own
// the cell next door. The fresh private key is returned ONCE for the inviter to
// hand to the new neighbour.
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
	cellManager.mu.Lock()
	defer cellManager.mu.Unlock()

	inviter, ok := cellManager.cells[body.Inviter]
	if !ok {
		authError(w, http.StatusNotFound, "Unknown inviter cell.")
		return
	}
	if !neighbourCoord(inviter, body.Q, body.R) {
		authError(w, http.StatusBadRequest, "That coordinate is not your neighbour.")
		return
	}
	if !verifySig(body.Inviter, inviteMessage(body.Q, body.R), body.Sig) {
		authError(w, http.StatusUnauthorized, "Invalid invite signature.")
		return
	}
	if _, taken := cellManager.coord[cellKey(body.Q, body.R)]; taken {
		authError(w, http.StatusConflict, "That neighbour cell is already taken.")
		return
	}
	pub, priv, err := genKeyPair()
	if err != nil {
		authError(w, http.StatusInternalServerError, "Could not generate neighbour keys.")
		return
	}
	cellManager.cells[pub] = &Cell{PubKey: pub, Q: body.Q, R: body.R, Created: time.Now()}
	cellManager.coord[cellKey(body.Q, body.R)] = pub
	saveCellsLocked()

	writeJSON(w, map[string]interface{}{
		"publicKey": pub, "privateKey": priv, "q": body.Q, "r": body.R, "status": "reserved",
	})
}

// handleCellApprove records a neighbour's signed attestation of a target cell's
// identity. Only an actual neighbour may approve, and the signature must verify.
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
	cellManager.mu.Lock()
	defer cellManager.mu.Unlock()

	ac, ok := cellManager.cells[body.Approver]
	if !ok {
		authError(w, http.StatusNotFound, "Unknown approver cell.")
		return
	}
	tc, ok := cellManager.cells[body.Target]
	if !ok {
		authError(w, http.StatusNotFound, "Unknown target cell.")
		return
	}
	if !neighbourCoord(tc, ac.Q, ac.R) {
		authError(w, http.StatusBadRequest, "You are not a neighbour of this cell.")
		return
	}
	if !verifySig(body.Approver, approveMessage(body.Target), body.Sig) {
		authError(w, http.StatusUnauthorized, "Invalid approval signature.")
		return
	}
	if cellManager.approvals[body.Target] == nil {
		cellManager.approvals[body.Target] = make(map[string]Approval)
	}
	cellManager.approvals[body.Target][body.Approver] = Approval{
		Approver: body.Approver, Target: body.Target, Sig: body.Sig, Created: time.Now(),
	}
	saveCellsLocked()

	writeJSON(w, map[string]interface{}{
		"target": body.Target,
		"status": cellManager.stageLocked(tc),
		"approvals": len(cellManager.approvals[body.Target]),
	})
}

// handleSendProfile relays an opaque end-to-end-encrypted profile to a
// neighbour. The backend stores only ciphertext — never the plaintext name.
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
	cellManager.mu.Lock()
	defer cellManager.mu.Unlock()

	if _, ok := cellManager.cells[body.From]; !ok {
		authError(w, http.StatusNotFound, "Unknown sender cell.")
		return
	}
	if !verifySig(body.From, "kando-profile:"+body.To, body.Sig) {
		authError(w, http.StatusUnauthorized, "Invalid sender signature.")
		return
	}
	cellManager.envelopes[body.To] = append(cellManager.envelopes[body.To], ProfileEnvelope{
		From: body.From, To: body.To, Ciphertext: body.Ciphertext, Created: time.Now(),
	})
	writeJSON(w, map[string]interface{}{"status": "ok"})
}

// handleFetchProfiles returns pending encrypted envelopes for a recipient.
// Ciphertext is useless without the recipient's private key, so no proof needed.
func handleFetchProfiles(w http.ResponseWriter, req *http.Request) {
	pk := req.URL.Query().Get("pubKey")
	cellManager.mu.RLock()
	defer cellManager.mu.RUnlock()
	writeJSON(w, map[string]interface{}{"envelopes": cellManager.envelopes[pk]})
}

// registerCellRoutes wires the key-based cell endpoints.
func registerCellRoutes(r *mux.Router) {
	loadCells()
	r.HandleFunc("/api/cell/mint-queen", handleMintQueen).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/cell/login", handleCellLogin).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/cell/invite", handleCellInvite).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/cell/approve", handleCellApprove).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/cell/profile", handleSendProfile).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/cell/profiles", handleFetchProfiles).Methods("GET", "OPTIONS")
}
