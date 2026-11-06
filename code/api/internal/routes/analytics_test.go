package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/myhobbees/api/internal/jwt"
)

func TestAnalytics_RequiresAuth(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret-at-least-32-characters-long")

	srv := httptest.NewServer(Analytics())
	defer srv.Close()

	res, err := http.Get(srv.URL + "/posthog/overview?days=7")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 without a token, got %d", res.StatusCode)
	}
}

func TestAnalytics_PostHogNotConfigured(t *testing.T) {
	secret := "test-secret-at-least-32-characters-long"
	t.Setenv("JWT_SECRET", secret)
	t.Setenv("POSTHOG_PERSONAL_API_KEY", "")
	t.Setenv("POSTHOG_PROJECT_ID", "")

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	srv := httptest.NewServer(Analytics())
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/posthog/overview?days=90", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadGateway {
		t.Fatalf("expected 502 when PostHog is not configured, got %d", res.StatusCode)
	}
}
