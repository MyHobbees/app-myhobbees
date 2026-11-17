package app

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/myhobbees/api/internal/jwt"
)

func TestPublicRoutesNeverRequireAuth(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret-at-least-32-characters-long")
	srv := httptest.NewServer(New())
	defer srv.Close()

	t.Run("health", func(t *testing.T) {
		res, err := http.Get(srv.URL + "/health")
		if err != nil {
			t.Fatalf("get: %v", err)
		}
		defer res.Body.Close()
		if res.StatusCode == http.StatusUnauthorized {
			t.Fatalf("expected /health to never be unauthorized, got %d", res.StatusCode)
		}
	})

	t.Run("auth login without credentials", func(t *testing.T) {
		res, err := http.Post(srv.URL+"/v1/auth/login", "application/json", nil)
		if err != nil {
			t.Fatalf("post: %v", err)
		}
		defer res.Body.Close()
		if res.StatusCode == http.StatusUnauthorized {
			t.Fatalf("expected /v1/auth/login to never be unauthorized for a missing body, got %d", res.StatusCode)
		}
	})
}

func TestProtectedRoutesRequireAuth(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret-at-least-32-characters-long")
	srv := httptest.NewServer(New())
	defer srv.Close()

	// Every GET mounted inside the protected /v1 group in app.go must 401
	// without a token. This is the single point of truth the group exists
	// to guarantee: a new r.Mount placed inside it is protected by
	// construction, even if its own router forgets auth.Middleware (see
	// aidd_docs/tasks/.../review.md, the fail-closed-by-accident finding).
	protectedPaths := []string{
		"/v1/shopify/status",
		"/v1/infra/staging/status",
		"/v1/example/me",
		"/v1/analytics/posthog/overview?days=30",
		"/v1/leads",
	}

	for _, path := range protectedPaths {
		t.Run(path, func(t *testing.T) {
			res, err := http.Get(srv.URL + path)
			if err != nil {
				t.Fatalf("get: %v", err)
			}
			defer res.Body.Close()
			if res.StatusCode != http.StatusUnauthorized {
				t.Fatalf("expected 401 without a token, got %d", res.StatusCode)
			}
		})
	}
}

// TestStagingMountedAtStagingSubpath exercises the real app.New() router
// with a valid token, so it actually depends on where app.go mounts
// Staging(). An unauthenticated request can't tell a correct mount from a
// reverted one: auth.Middleware wraps the whole protected group, including
// its NotFound fallback, so every path under /v1 401s regardless of whether
// it resolves to a real route (see TestProtectedRoutesRequireAuth above,
// which only proves the group requires a token — nothing about routing).
// Authenticating removes that confound: if app.go's mount path ever
// regresses to the old "/infra" bug, these requests 404 instead of
// returning the status codes asserted below.
func TestStagingMountedAtStagingSubpath(t *testing.T) {
	secret := "test-secret-at-least-32-characters-long"
	t.Setenv("JWT_SECRET", secret)
	t.Setenv("STAGING_DB_IDENTIFIER", "")
	srv := httptest.NewServer(New())
	defer srv.Close()

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	t.Run("status", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, srv.URL+"/v1/infra/staging/status", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("get: %v", err)
		}
		defer res.Body.Close()
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 from the real mount, got %d", res.StatusCode)
		}
	})

	t.Run("start", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPost, srv.URL+"/v1/infra/staging/start", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("post: %v", err)
		}
		defer res.Body.Close()
		if res.StatusCode != http.StatusConflict {
			t.Fatalf("expected 409 from the real mount, got %d", res.StatusCode)
		}
	})
}

func TestPublicLeadCaptureNeverRequiresAuth(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret-at-least-32-characters-long")
	srv := httptest.NewServer(New())
	defer srv.Close()

	res, err := http.Post(srv.URL+"/v1/leads", "application/json", nil)
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusUnauthorized {
		t.Fatalf("expected POST /v1/leads to never be unauthorized for a missing body, got %d", res.StatusCode)
	}
}
