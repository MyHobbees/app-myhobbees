package routes

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/jwt"
)

const appUserTestJWTSecret = "test-secret-at-least-32-characters-long"

func TestAppMe_ReturnsPrincipal(t *testing.T) {
	t.Setenv("JWT_SECRET", appUserTestJWTSecret)

	srv := httptest.NewServer(auth.AppMiddleware(App()))
	defer srv.Close()

	token, err := jwt.Sign(appUserTestJWTSecret, "user-1", "user@myhobbees.fr", false, jwt.AudienceApp, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.StatusCode)
	}

	var decoded map[string]string
	if err := json.NewDecoder(res.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if decoded["userId"] != "user-1" {
		t.Fatalf("expected userId=user-1, got %q", decoded["userId"])
	}
	if decoded["email"] != "user@myhobbees.fr" {
		t.Fatalf("expected email=user@myhobbees.fr, got %q", decoded["email"])
	}
}

// TestAppMe_NoPrincipalReturnsUnauthorized covers the handler's own defense
// in depth: App() must never be mounted without auth.AppMiddleware in front
// of it, but if it ever is, the handler alone must still refuse to answer
// without a principal in context, exactly like routes.Example()'s "/me".
func TestAppMe_NoPrincipalReturnsUnauthorized(t *testing.T) {
	srv := httptest.NewServer(App())
	defer srv.Close()

	res, err := http.Get(srv.URL + "/me")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", res.StatusCode)
	}
}
