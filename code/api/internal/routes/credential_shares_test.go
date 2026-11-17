package routes

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/credentialshare"
)

// credentialSharesServer wires the same two routes app.go mounts for this
// flow: the super-admin-only Admins() router (to create an admin and get a
// shareToken) and the public ConsumeCredentialShare handler (to consume
// it), side by side under /v1 like the real app does.
func credentialSharesServer(t *testing.T) *httptest.Server {
	t.Helper()
	t.Setenv("JWT_SECRET", adminsTestJWTSecret)
	t.Setenv("CREDENTIAL_SHARE_SECRET", adminsTestShareSecret)

	r := chi.NewRouter()
	r.Route("/v1", func(r chi.Router) {
		r.Post("/credential-shares", ConsumeCredentialShare)
		r.Group(func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Use(auth.RequireSuperAdmin)
			r.Mount("/admins", Admins())
		})
	})

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	return srv
}

// createAdminViaHTTP calls POST /v1/admins and decodes the response,
// failing the test on anything but 201.
func createAdminViaHTTP(t *testing.T, baseURL, token, email string) createAdminResponse {
	t.Helper()
	res := doJSON(t, http.MethodPost, baseURL+"/v1/admins", token, map[string]any{"email": email})
	defer res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 creating admin, got %d", res.StatusCode)
	}
	var decoded createAdminResponse
	if err := json.NewDecoder(res.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	return decoded
}

// consumeCredentialShare POSTs the token in the JSON body, matching the
// real route (app.go mounts ConsumeCredentialShare as a POST, not a GET
// with the token in the path — see that handler's doc comment for why).
func consumeCredentialShare(baseURL, token string) *http.Response {
	body, err := json.Marshal(map[string]string{"token": token})
	if err != nil {
		panic(err)
	}
	res, err := http.Post(baseURL+"/v1/credential-shares", "application/json", bytes.NewReader(body))
	if err != nil {
		panic(err)
	}
	return res
}

// TestCredentialShare_HappyPathCreateThenConsume covers the Test Scope's
// "Happy path - création puis consultation": creating an admin returns a
// shareToken, and opening it once reveals the real email and a strong
// generated password.
func TestCredentialShare_HappyPathCreateThenConsume(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := credentialSharesServer(t)

	created := createAdminViaHTTP(t, srv.URL, token, "shared-admin@myhobbees.fr")

	res := consumeCredentialShare(srv.URL, created.ShareToken)
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 opening a fresh share token, got %d", res.StatusCode)
	}
	var revealed credentialShareResponse
	if err := json.NewDecoder(res.Body).Decode(&revealed); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if revealed.Email != "shared-admin@myhobbees.fr" {
		t.Fatalf("unexpected email: %s", revealed.Email)
	}
	if len(revealed.Password) < 12 {
		t.Fatalf("expected a password of at least 12 characters, got %d", len(revealed.Password))
	}
}

// TestCredentialShare_SecondConsumeFails covers "Edge case - double
// consultation": the same token must answer 404 on a second POST.
func TestCredentialShare_SecondConsumeFails(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := credentialSharesServer(t)

	created := createAdminViaHTTP(t, srv.URL, token, "once-only@myhobbees.fr")

	first := consumeCredentialShare(srv.URL, created.ShareToken)
	first.Body.Close()
	if first.StatusCode != http.StatusOK {
		t.Fatalf("expected first open to succeed with 200, got %d", first.StatusCode)
	}

	second := consumeCredentialShare(srv.URL, created.ShareToken)
	defer second.Body.Close()
	if second.StatusCode != http.StatusNotFound {
		t.Fatalf("expected second open of the same token to be 404, got %d", second.StatusCode)
	}
}

// TestCredentialShare_ExpiredTokenFails covers "Edge case - token expiré":
// a token sealed with Exp in the past must 404, never a 500.
func TestCredentialShare_ExpiredTokenFails(t *testing.T) {
	pool := testAdminsPool(t)
	srv := credentialSharesServer(t)

	var shareID int64
	err := pool.QueryRow(context.Background(), `INSERT INTO credential_shares DEFAULT VALUES RETURNING id`).Scan(&shareID)
	if err != nil {
		t.Fatalf("insert credential share: %v", err)
	}
	expiredToken, err := credentialshare.Seal(adminsTestShareSecret, credentialshare.Payload{
		Email:    "expired@myhobbees.fr",
		Password: "whatever-password-here",
		ShareID:  shareID,
		Exp:      time.Now().Add(-time.Hour).Unix(),
	})
	if err != nil {
		t.Fatalf("seal: %v", err)
	}

	res := consumeCredentialShare(srv.URL, expiredToken)
	defer res.Body.Close()
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for an expired token, got %d", res.StatusCode)
	}
}

// TestCredentialShare_TamperedTokenFails covers "Edge case - token
// falsifié": a token modified by one character must 404, never a 500.
func TestCredentialShare_TamperedTokenFails(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := credentialSharesServer(t)

	created := createAdminViaHTTP(t, srv.URL, token, "tampered@myhobbees.fr")

	tampered := []byte(created.ShareToken)
	idx := len(tampered) / 2
	if tampered[idx] == 'a' {
		tampered[idx] = 'b'
	} else {
		tampered[idx] = 'a'
	}

	res := consumeCredentialShare(srv.URL, string(tampered))
	defer res.Body.Close()
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for a tampered token, got %d", res.StatusCode)
	}
}

// TestCredentialShare_InvalidTokenFails covers a token that was never a
// valid sealed payload at all (not merely a tampered real one).
func TestCredentialShare_InvalidTokenFails(t *testing.T) {
	testAdminsPool(t)
	srv := credentialSharesServer(t)

	res := consumeCredentialShare(srv.URL, "this-is-not-a-real-token")
	defer res.Body.Close()
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for an invalid token, got %d", res.StatusCode)
	}
}

// TestCredentialShare_ConcurrentReadsExactlyOneSucceeds covers "Edge case -
// lecture simultanée": firing two concurrent POSTs at the same freshly
// created token must let exactly one see 200, the other 404 — never both
// 200, and never both 404. This is the direct test for the atomic
// `UPDATE ... WHERE consumed_at IS NULL` in ConsumeCredentialShare; run with
// `go test -race` to also catch any data race in reaching that guarantee.
func TestCredentialShare_ConcurrentReadsExactlyOneSucceeds(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := credentialSharesServer(t)

	created := createAdminViaHTTP(t, srv.URL, token, "race-admin@myhobbees.fr")

	var wg sync.WaitGroup
	statuses := make([]int, 2)
	for i := range statuses {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			res := consumeCredentialShare(srv.URL, created.ShareToken)
			defer res.Body.Close()
			statuses[i] = res.StatusCode
		}(i)
	}
	wg.Wait()

	okCount, notFoundCount := 0, 0
	for _, s := range statuses {
		switch s {
		case http.StatusOK:
			okCount++
		case http.StatusNotFound:
			notFoundCount++
		default:
			t.Fatalf("unexpected status code %d among concurrent reads", s)
		}
	}
	if okCount != 1 || notFoundCount != 1 {
		t.Fatalf("expected exactly one 200 and one 404 among concurrent reads, got %d 200s and %d 404s", okCount, notFoundCount)
	}
}

// TestConsumeCredentialShare_MisconfiguredSecretReturns500 is the
// regression test for the review's minor finding: GetCredentialShare used
// to pass os.Getenv straight into Open, so a wrong-sized
// CREDENTIAL_SHARE_SECRET would collapse into Open's generic
// ErrInvalidOrExpired and surface as an ordinary 404 ("every link is
// silently invalid") instead of a loud, diagnosable failure — asymmetric
// with createAdmin, which already re-validates the secret before sealing.
// This calls the handler directly (no DB, no router) since the
// misconfiguration must be caught before either is ever touched.
func TestConsumeCredentialShare_MisconfiguredSecretReturns500(t *testing.T) {
	t.Setenv("CREDENTIAL_SHARE_SECRET", "too-short-for-aes-256")

	body, err := json.Marshal(map[string]string{"token": "whatever-token"})
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/v1/credential-shares", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	ConsumeCredentialShare(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 for a misconfigured share secret, got %d", rec.Code)
	}
}
