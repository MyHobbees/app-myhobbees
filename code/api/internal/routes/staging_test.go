package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/jwt"
)

// Staging() no longer applies auth.Middleware itself: that single
// responsibility lives in app.go's protected /v1 group (mirrors
// analytics_test.go). This suite only exercises Staging()'s own route
// handlers in isolation (status codes, the not-configured branch); it
// mounts at its own "/infra/staging" literal rather than going through
// app.New(), so it does NOT guard against app.go's mount path drifting —
// that regression guard lives in
// TestStagingMountedAtStagingSubpath in internal/app/app_test.go, which
// builds the real router and would 404 if the mount path regressed.
func stagingTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	r := chi.NewRouter()
	r.Mount("/infra/staging", Staging())
	return httptest.NewServer(auth.Middleware(r))
}

func TestStaging_StatusNotConfigured(t *testing.T) {
	secret := "test-secret-at-least-32-characters-long"
	t.Setenv("JWT_SECRET", secret)
	t.Setenv("STAGING_DB_IDENTIFIER", "")

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", true, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	srv := stagingTestServer(t)
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/infra/staging/status", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 when not configured, got %d", res.StatusCode)
	}
}

func TestStaging_StartNotConfigured(t *testing.T) {
	secret := "test-secret-at-least-32-characters-long"
	t.Setenv("JWT_SECRET", secret)
	t.Setenv("STAGING_DB_IDENTIFIER", "")

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", true, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	srv := stagingTestServer(t)
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/infra/staging/start", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusConflict {
		t.Fatalf("expected 409 when not configured, got %d", res.StatusCode)
	}
}
