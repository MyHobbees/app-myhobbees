package app

import (
	"net/http"
	"net/http/httptest"
	"testing"
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

	res, err := http.Get(srv.URL + "/v1/shopify/status")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 without a token, got %d", res.StatusCode)
	}
}
