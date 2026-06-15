package main

// Waitlist: the public front door. A visitor who has no invite leaves their
// email here instead of entering the hive. Joining the waitlist deliberately
// grants NO session and NO hive identity — entry is by invite code only. The
// list is persisted to its own JSON file, separate from accounts and state.

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
)

// WaitlistEntry is one person waiting for access.
type WaitlistEntry struct {
	Email   string    `json:"email"`
	Name    string    `json:"name,omitempty"`
	Created time.Time `json:"created"`
}

type WaitlistManager struct {
	mu      sync.RWMutex
	entries map[string]WaitlistEntry // key: lower(email)
}

var waitlistManager = &WaitlistManager{entries: make(map[string]WaitlistEntry)}

var waitlistFile = func() string {
	if f := os.Getenv("WAITLIST_FILE"); f != "" {
		return f
	}
	return "kando-waitlist.json"
}()

func loadWaitlist() {
	data, err := os.ReadFile(waitlistFile)
	if err != nil {
		return
	}
	var entries map[string]WaitlistEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return
	}
	waitlistManager.mu.Lock()
	defer waitlistManager.mu.Unlock()
	if entries != nil {
		waitlistManager.entries = entries
	}
}

// saveWaitlistLocked persists the list. Caller must hold waitlistManager.mu.
func saveWaitlistLocked() {
	data, err := json.MarshalIndent(waitlistManager.entries, "", "  ")
	if err != nil {
		return
	}
	tmp := waitlistFile + ".tmp"
	if err := os.WriteFile(tmp, data, 0o600); err != nil {
		return
	}
	os.Rename(tmp, waitlistFile)
}

// handleWaitlistJoin stores an email on the waitlist. It never issues a session
// — joining the waitlist does not grant chat access.
func handleWaitlistJoin(w http.ResponseWriter, req *http.Request) {
	var body struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		authError(w, http.StatusBadRequest, "Invalid request.")
		return
	}
	email := normalizeEmail(body.Email)
	if !emailRe.MatchString(email) {
		authError(w, http.StatusBadRequest, "Please enter a valid email address.")
		return
	}
	name := strings.TrimSpace(body.Name)

	waitlistManager.mu.Lock()
	defer waitlistManager.mu.Unlock()

	if _, exists := waitlistManager.entries[email]; exists {
		writeJSON(w, map[string]interface{}{"status": "already", "message": "You're already on the waitlist."})
		return
	}
	waitlistManager.entries[email] = WaitlistEntry{Email: email, Name: name, Created: time.Now()}
	saveWaitlistLocked()
	writeJSON(w, map[string]interface{}{"status": "ok", "position": len(waitlistManager.entries)})
}

// registerWaitlistRoutes wires the waitlist endpoint onto the main router.
func registerWaitlistRoutes(r *mux.Router) {
	loadWaitlist()
	r.HandleFunc("/api/waitlist", handleWaitlistJoin).Methods("POST", "OPTIONS")
}
