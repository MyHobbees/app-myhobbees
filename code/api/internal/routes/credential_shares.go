package routes

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/credentialshare"
	"github.com/myhobbees/api/internal/db"
	"github.com/myhobbees/api/internal/httpjson"
)

// credentialShareResponse is the one-time payload revealed to whoever
// opens the share link: email and plaintext password, nothing else. There
// is deliberately no field distinguishing "already consumed" from
// "invalid token" from "expired" — see ConsumeCredentialShare.
type credentialShareResponse struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type consumeCredentialShareBody struct {
	Token string `json:"token"`
}

// ConsumeCredentialShare is mounted outside the authenticated /v1 group
// (app.go): anyone holding the link can open it, exactly once.
//
// The token travels in the POST body, not the URL path. It used to be a
// GET /{token}: middleware.Logger logs the full request URL on every
// request, so that path put the complete token in stdout (CloudWatch in
// prod) on every call — including the failure path where db.Pool/the
// UPDATE errors out *before* consumption, leaving a still-valid token
// sitting in a long-retention log. A path segment also lands in browser
// history and any Referer header. Moving the token into the body avoids
// all three without needing special-case log redaction, and is also a
// better semantic fit: this was never an idempotent GET to begin with —
// it mutates credential_shares.consumed_at as its very point.
//
// A failed Open (tampered/wrong-secret/expired token) and an
// already-consumed token both answer 404 with the same generic message,
// so a caller can never distinguish "this link never existed" from
// "someone already used it" from "it expired".
func ConsumeCredentialShare(w http.ResponseWriter, req *http.Request) {
	var body consumeCredentialShareBody
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil || body.Token == "" {
		httpjson.Error(w, http.StatusNotFound, "Not found")
		return
	}

	secret := os.Getenv("CREDENTIAL_SHARE_SECRET")
	if err := auth.ValidateShareSecret(secret); err != nil {
		// Mirrors createAdmin's defense in depth (admins.go): boot-time
		// validation makes this unreachable today, but without this check
		// a misconfigured secret would collapse into Open's generic error
		// below and present as "every link is silently invalid" instead
		// of a loud, diagnosable failure.
		log.Printf("credential-shares: secret misconfigured: %v", err)
		httpjson.Error(w, http.StatusInternalServerError, "Could not load share")
		return
	}

	// Open's only exported error is credentialshare.ErrInvalidOrExpired
	// (see its package doc): there is nothing else to distinguish or log
	// here, so a failure goes straight to the generic 404.
	payload, err := credentialshare.Open(secret, body.Token)
	if err != nil {
		httpjson.Error(w, http.StatusNotFound, "Not found")
		return
	}

	pool, err := db.Pool(req.Context())
	if err != nil {
		log.Printf("credential-shares: db pool: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not load share")
		return
	}

	// The WHERE consumed_at IS NULL inside this single UPDATE is what
	// makes consumption atomic: two concurrent requests for the same
	// still-fresh token can both reach this line, but only one of their
	// UPDATEs affects a row — Postgres serializes the row-level write, so
	// there is no read-then-write window for both to "win".
	tag, err := pool.Exec(req.Context(), `
		UPDATE credential_shares
		SET consumed_at = NOW()
		WHERE id = $1 AND consumed_at IS NULL
	`, payload.ShareID)
	if err != nil {
		log.Printf("credential-shares: consume: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not load share")
		return
	}
	if tag.RowsAffected() == 0 {
		httpjson.Error(w, http.StatusNotFound, "Not found")
		return
	}

	httpjson.OK(w, http.StatusOK, credentialShareResponse{
		Email:    payload.Email,
		Password: payload.Password,
	})
}
