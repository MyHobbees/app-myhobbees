package routes

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/githubactions"
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

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", true, jwt.AudienceBackoffice, time.Hour)
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

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", true, jwt.AudienceBackoffice, time.Hour)
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

func TestStaging_MigrateNotConfigured(t *testing.T) {
	secret := "test-secret-at-least-32-characters-long"
	t.Setenv("JWT_SECRET", secret)
	t.Setenv("GITHUB_ACTIONS_TOKEN", "")

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", true, jwt.AudienceBackoffice, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	srv := stagingTestServer(t)
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/infra/staging/migrate", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusConflict {
		t.Fatalf("expected 409 when GITHUB_ACTIONS_TOKEN is not configured, got %d", res.StatusCode)
	}
}

func TestStaging_MigrateSuccess(t *testing.T) {
	secret := "test-secret-at-least-32-characters-long"
	t.Setenv("JWT_SECRET", secret)
	t.Setenv("GITHUB_ACTIONS_TOKEN", "test-github-token")

	ghSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-github-token" {
			t.Errorf("unexpected Authorization header sent to GitHub: %q", r.Header.Get("Authorization"))
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer ghSrv.Close()

	original := githubactions.APIBaseURL
	githubactions.APIBaseURL = ghSrv.URL
	defer func() { githubactions.APIBaseURL = original }()

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", true, jwt.AudienceBackoffice, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	srv := stagingTestServer(t)
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/infra/staging/migrate", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusAccepted {
		t.Fatalf("expected 202 on successful dispatch, got %d", res.StatusCode)
	}
}

func TestStaging_MigrateGitHubError(t *testing.T) {
	secret := "test-secret-at-least-32-characters-long"
	t.Setenv("JWT_SECRET", secret)
	t.Setenv("GITHUB_ACTIONS_TOKEN", "test-github-token")

	ghSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"message":"internal detail that must never reach the client"}`))
	}))
	defer ghSrv.Close()

	original := githubactions.APIBaseURL
	githubactions.APIBaseURL = ghSrv.URL
	defer func() { githubactions.APIBaseURL = original }()

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", true, jwt.AudienceBackoffice, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	srv := stagingTestServer(t)
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/infra/staging/migrate", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadGateway {
		t.Fatalf("expected 502 when GitHub refuses, got %d", res.StatusCode)
	}

	respBody := new(strings.Builder)
	if _, err := io.Copy(respBody, res.Body); err != nil {
		t.Fatalf("read body: %v", err)
	}
	if strings.Contains(respBody.String(), "internal detail") || strings.Contains(respBody.String(), "test-github-token") {
		t.Fatalf("response leaked GitHub's body or the token: %q", respBody.String())
	}
}
