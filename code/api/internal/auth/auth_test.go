package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/myhobbees/api/internal/jwt"
)

const testSecret = "test-secret-at-least-32-characters-long"

func withSecret(t *testing.T, secret string) {
	t.Helper()
	t.Setenv("JWT_SECRET", secret)
}

func TestMiddleware_ValidToken(t *testing.T) {
	withSecret(t, testSecret)
	token, err := jwt.Sign(testSecret, "admin", "admin@myhobbees.fr", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		principal, ok := PrincipalFrom(r.Context())
		if !ok {
			t.Fatal("expected principal in context")
		}
		if principal.Email != "admin@myhobbees.fr" {
			t.Fatalf("unexpected email: %s", principal.Email)
		}
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/shopify/status", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	Middleware(next).ServeHTTP(rec, req)

	if !called {
		t.Fatal("expected next handler to be called")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestMiddleware_MissingToken(t *testing.T) {
	withSecret(t, testSecret)

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/shopify/status", nil)
	rec := httptest.NewRecorder()

	Middleware(next).ServeHTTP(rec, req)

	if called {
		t.Fatal("next handler must not be called without a token")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestMiddleware_InvalidSignature(t *testing.T) {
	withSecret(t, testSecret)
	token, err := jwt.Sign("a-different-secret-at-least-32-chars", "admin", "admin@myhobbees.fr", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	called := false
	next := okHandlerCalled(&called)

	req := httptest.NewRequest(http.MethodGet, "/v1/leads", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	Middleware(next).ServeHTTP(rec, req)

	if called {
		t.Fatal("next handler must not be called with a token signed by another secret")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestMiddleware_ExpiredToken(t *testing.T) {
	withSecret(t, testSecret)
	token, err := jwt.Sign(testSecret, "admin", "admin@myhobbees.fr", -time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	called := false
	next := okHandlerCalled(&called)

	req := httptest.NewRequest(http.MethodGet, "/v1/leads", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	Middleware(next).ServeHTTP(rec, req)

	if called {
		t.Fatal("next handler must not be called with an expired token")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestMiddleware_MalformedHeader(t *testing.T) {
	withSecret(t, testSecret)

	called := false
	next := okHandlerCalled(&called)

	req := httptest.NewRequest(http.MethodGet, "/v1/shopify/status", nil)
	req.Header.Set("Authorization", "NotBearer sometoken")
	rec := httptest.NewRecorder()

	Middleware(next).ServeHTTP(rec, req)

	if called {
		t.Fatal("next handler must not be called with a malformed header")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func okHandlerCalled(called *bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		*called = true
		w.WriteHeader(http.StatusOK)
	})
}
