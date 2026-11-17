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
		"/v1/example/me",
		"/v1/analytics/posthog/overview?days=30",
		"/v1/leads",
		"/v1/admins",
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

// TestAdminsRouteRequiresSuperAdmin covers the phase 2 acceptance criterion:
// a non-super-admin keeps normal access to the rest of /v1 (never 401/403
// there just for lacking the role) while /v1/admins specifically answers
// 403. Mounting RequireSuperAdmin only around /admins must not leak onto
// the sibling routes in the same protected group.
func TestAdminsRouteRequiresSuperAdmin(t *testing.T) {
	secret := "test-secret-at-least-32-characters-long"
	t.Setenv("JWT_SECRET", secret)
	srv := httptest.NewServer(New())
	defer srv.Close()

	token, err := jwt.Sign(secret, "42", "admin@myhobbees.fr", false, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	get := func(path string) *http.Response {
		req, _ := http.NewRequest(http.MethodGet, srv.URL+path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("get %s: %v", path, err)
		}
		return res
	}

	t.Run("admins is forbidden for a non-super-admin", func(t *testing.T) {
		res := get("/v1/admins")
		defer res.Body.Close()
		if res.StatusCode != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", res.StatusCode)
		}
	})

	// Neither of these routes requires super-admin: a plain admin's token
	// must still clear auth.Middleware for them (401 would mean the
	// RequireSuperAdmin group leaked onto sibling routes; any other status,
	// including a 502 from a dependency this test doesn't configure, proves
	// authorization itself was never the blocker).
	for _, path := range []string{"/v1/leads", "/v1/analytics/posthog/overview?days=30"} {
		t.Run("stays reachable: "+path, func(t *testing.T) {
			res := get(path)
			defer res.Body.Close()
			if res.StatusCode == http.StatusUnauthorized || res.StatusCode == http.StatusForbidden {
				t.Fatalf("expected a non-super-admin to keep access to %s, got %d", path, res.StatusCode)
			}
		})
	}
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
