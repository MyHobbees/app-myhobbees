package routes

import (
	"errors"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/credentialshare"
	"github.com/myhobbees/api/internal/db"
	"github.com/myhobbees/api/internal/httpjson"
)

// credentialShareResponse is the one-time payload revealed to whoever
// opens the share link: email and plaintext password, nothing else. There
// is deliberately no field distinguishing "already consumed" from
// "invalid token" from "expired" — see GetCredentialShare.
type credentialShareResponse struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// GetCredentialShare is mounted outside the authenticated /v1 group
// (app.go): anyone holding the link can open it, exactly once. A failed
// Open (tampered/wrong-secret/expired token) and an already-consumed
// token both answer 404 with the same generic message, so a caller can
// never distinguish "this link never existed" from "someone already used
// it" from "it expired".
func GetCredentialShare(w http.ResponseWriter, req *http.Request) {
	token := chi.URLParam(req, "token")

	secret := os.Getenv("CREDENTIAL_SHARE_SECRET")
	payload, err := credentialshare.Open(secret, token)
	if err != nil {
		if !errors.Is(err, credentialshare.ErrInvalidOrExpired) {
			log.Printf("credential-shares: open: %v", err)
		}
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
