package main

// Account authentication: email + password login/registration with a
// security-question password reset. Accounts are bcrypt-hashed and persisted
// to their own JSON file (separate from the hive state). Sessions are opaque
// bearer tokens. This is the gate users pass before they get a hive identity.

import (
	"encoding/json"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
)

// Account is one registered user. Secrets are never returned to the client.
type Account struct {
	Name          string    `json:"name"`
	Email         string    `json:"email"`
	PasswordHash  string    `json:"passwordHash"`
	SecurityQ     string    `json:"securityQuestion"`
	SecurityAHash string    `json:"securityAnswerHash"`
	Created       time.Time `json:"created"`
}

// PublicAccount is the safe shape sent to the browser.
type PublicAccount struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	SecurityQ string `json:"securityQuestion,omitempty"`
}

func (a *Account) public() PublicAccount {
	return PublicAccount{Name: a.Name, Email: a.Email, SecurityQ: a.SecurityQ}
}

type AccountManager struct {
	mu       sync.RWMutex
	accounts map[string]*Account // key: lower(email)
	sessions map[string]string   // token → lower(email)
}

var accountManager = &AccountManager{
	accounts: make(map[string]*Account),
	sessions: make(map[string]string),
}

var accountsFile = func() string {
	if f := os.Getenv("ACCOUNTS_FILE"); f != "" {
		return f
	}
	return "kando-accounts.json"
}()

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func normalizeEmail(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

// normalizeAnswer makes security-answer matching case/space-insensitive.
func normalizeAnswer(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

// ── Persistence ───────────────────────────────────────────────────────────────

type accountsState struct {
	Accounts map[string]*Account `json:"accounts"`
	Sessions map[string]string   `json:"sessions"`
}

func loadAccounts() {
	data, err := os.ReadFile(accountsFile)
	if err != nil {
		return
	}
	var st accountsState
	if err := json.Unmarshal(data, &st); err != nil {
		return
	}
	accountManager.mu.Lock()
	defer accountManager.mu.Unlock()
	if st.Accounts != nil {
		accountManager.accounts = st.Accounts
	}
	if st.Sessions != nil {
		accountManager.sessions = st.Sessions
	}
}

// saveAccountsLocked persists accounts. Caller must hold accountManager.mu.
func saveAccountsLocked() {
	st := accountsState{Accounts: accountManager.accounts, Sessions: accountManager.sessions}
	data, err := json.MarshalIndent(st, "", "  ")
	if err != nil {
		return
	}
	tmp := accountsFile + ".tmp"
	if err := os.WriteFile(tmp, data, 0o600); err != nil {
		return
	}
	os.Rename(tmp, accountsFile)
}

func authError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// newSessionLocked issues a token for an email. Caller holds the write lock.
func newSessionLocked(email string) string {
	token := randToken()
	accountManager.sessions[token] = email
	return token
}

// ── Handlers ──────────────────────────────────────────────────────────────────

func handleAuthRegister(w http.ResponseWriter, req *http.Request) {
	var body struct {
		Name             string `json:"name"`
		Email            string `json:"email"`
		Password         string `json:"password"`
		SecurityQuestion string `json:"securityQuestion"`
		SecurityAnswer   string `json:"securityAnswer"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		authError(w, http.StatusBadRequest, "Invalid request.")
		return
	}

	name := strings.TrimSpace(body.Name)
	email := normalizeEmail(body.Email)
	question := strings.TrimSpace(body.SecurityQuestion)
	answer := normalizeAnswer(body.SecurityAnswer)

	switch {
	case len(name) < 2:
		authError(w, http.StatusBadRequest, "Name must be at least 2 characters.")
		return
	case !emailRe.MatchString(email):
		authError(w, http.StatusBadRequest, "Please enter a valid email address.")
		return
	case len(body.Password) < 6:
		authError(w, http.StatusBadRequest, "Password must be at least 6 characters.")
		return
	case question == "":
		authError(w, http.StatusBadRequest, "Please choose a security question.")
		return
	case answer == "":
		authError(w, http.StatusBadRequest, "Please provide a security answer.")
		return
	}

	accountManager.mu.Lock()
	defer accountManager.mu.Unlock()

	if _, exists := accountManager.accounts[email]; exists {
		authError(w, http.StatusConflict, "An account with this email already exists.")
		return
	}

	passHash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		authError(w, http.StatusInternalServerError, "Could not create account.")
		return
	}
	ansHash, err := bcrypt.GenerateFromPassword([]byte(answer), bcrypt.DefaultCost)
	if err != nil {
		authError(w, http.StatusInternalServerError, "Could not create account.")
		return
	}

	acc := &Account{
		Name:          name,
		Email:         email,
		PasswordHash:  string(passHash),
		SecurityQ:     question,
		SecurityAHash: string(ansHash),
		Created:       time.Now(),
	}
	accountManager.accounts[email] = acc
	token := newSessionLocked(email)
	saveAccountsLocked()

	writeJSON(w, map[string]interface{}{"token": token, "account": acc.public()})
}

func handleAuthLogin(w http.ResponseWriter, req *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		authError(w, http.StatusBadRequest, "Invalid request.")
		return
	}
	email := normalizeEmail(body.Email)

	accountManager.mu.Lock()
	defer accountManager.mu.Unlock()

	acc, ok := accountManager.accounts[email]
	if !ok || bcrypt.CompareHashAndPassword([]byte(acc.PasswordHash), []byte(body.Password)) != nil {
		authError(w, http.StatusUnauthorized, "Incorrect email or password.")
		return
	}

	token := newSessionLocked(email)
	saveAccountsLocked()
	writeJSON(w, map[string]interface{}{"token": token, "account": acc.public()})
}

// handleAuthSecurityQuestion returns the question for an email so the reset
// form can show it. It does not reveal whether the account exists beyond that.
func handleAuthSecurityQuestion(w http.ResponseWriter, req *http.Request) {
	email := normalizeEmail(req.URL.Query().Get("email"))
	accountManager.mu.RLock()
	defer accountManager.mu.RUnlock()
	acc, ok := accountManager.accounts[email]
	if !ok {
		authError(w, http.StatusNotFound, "No account found for this email.")
		return
	}
	writeJSON(w, map[string]string{"securityQuestion": acc.SecurityQ})
}

func handleAuthReset(w http.ResponseWriter, req *http.Request) {
	var body struct {
		Email          string `json:"email"`
		SecurityAnswer string `json:"securityAnswer"`
		NewPassword    string `json:"newPassword"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		authError(w, http.StatusBadRequest, "Invalid request.")
		return
	}
	email := normalizeEmail(body.Email)
	answer := normalizeAnswer(body.SecurityAnswer)

	if len(body.NewPassword) < 6 {
		authError(w, http.StatusBadRequest, "Password must be at least 6 characters.")
		return
	}

	accountManager.mu.Lock()
	defer accountManager.mu.Unlock()

	acc, ok := accountManager.accounts[email]
	if !ok {
		authError(w, http.StatusNotFound, "No account found for this email.")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(acc.SecurityAHash), []byte(answer)) != nil {
		authError(w, http.StatusUnauthorized, "Security answer is incorrect.")
		return
	}

	passHash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		authError(w, http.StatusInternalServerError, "Could not reset password.")
		return
	}
	acc.PasswordHash = string(passHash)

	// Invalidate any existing sessions for this email, then issue a fresh one.
	for tok, e := range accountManager.sessions {
		if e == email {
			delete(accountManager.sessions, tok)
		}
	}
	token := newSessionLocked(email)
	saveAccountsLocked()
	writeJSON(w, map[string]interface{}{"token": token, "account": acc.public()})
}

func bearerToken(req *http.Request) string {
	h := req.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(h), "bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return ""
}

// handleAuthMe validates a token and returns the account — used to restore a
// session when the page reloads.
func handleAuthMe(w http.ResponseWriter, req *http.Request) {
	token := bearerToken(req)
	accountManager.mu.RLock()
	defer accountManager.mu.RUnlock()
	email, ok := accountManager.sessions[token]
	if !ok {
		authError(w, http.StatusUnauthorized, "Session expired.")
		return
	}
	acc, ok := accountManager.accounts[email]
	if !ok {
		authError(w, http.StatusUnauthorized, "Session expired.")
		return
	}
	writeJSON(w, map[string]interface{}{"account": acc.public()})
}

func handleAuthLogout(w http.ResponseWriter, req *http.Request) {
	token := bearerToken(req)
	accountManager.mu.Lock()
	delete(accountManager.sessions, token)
	saveAccountsLocked()
	accountManager.mu.Unlock()
	writeJSON(w, map[string]string{"status": "ok"})
}

// registerAuthRoutes wires the auth endpoints onto the main router.
func registerAuthRoutes(r *mux.Router) {
	loadAccounts()
	r.HandleFunc("/api/auth/register", handleAuthRegister).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/login", handleAuthLogin).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/security-question", handleAuthSecurityQuestion).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/auth/reset", handleAuthReset).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/me", handleAuthMe).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/auth/logout", handleAuthLogout).Methods("POST", "OPTIONS")
}
