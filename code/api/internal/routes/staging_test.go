package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/jwt"
)

// Staging() no longer applies auth.Middleware itself: that single
// responsibility lives in app.go's protected /v1 group (mirrors
// analytics_test.go). Tests here wrap it the same way app.go does.

func TestStaging_StatusNotConfigured(t *testing.T) {
	secret := "test-secret-at-least-32-characters-long"
	t.Setenv("JWT_SECRET", secret)
	t.Setenv("STAGING_DB_IDENTIFIER", "")

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	srv := httptest.NewServer(auth.Middleware(Staging()))
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/status", nil)
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

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	srv := httptest.NewServer(auth.Middleware(Staging()))
	defer srv.Close()

	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/start", nil)
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
