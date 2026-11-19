package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
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
	token, err := jwt.Sign(testSecret, "admin", "admin@myhobbees.fr", false, jwt.AudienceBackoffice, time.Hour)
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
	token, err := jwt.Sign("a-different-secret-at-least-32-chars", "admin", "admin@myhobbees.fr", false, jwt.AudienceBackoffice, time.Hour)
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
	token, err := jwt.Sign(testSecret, "admin", "admin@myhobbees.fr", false, jwt.AudienceBackoffice, -time.Hour)
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

func TestMiddleware_RejectsAppAudienceToken(t *testing.T) {
	withSecret(t, testSecret)
	token, err := jwt.Sign(testSecret, "user-1", "user@myhobbees.fr", false, jwt.AudienceApp, time.Hour)
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
		t.Fatal("next handler must not be called with an app-audience token")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestAppMiddleware_ValidToken(t *testing.T) {
	withSecret(t, testSecret)
	token, err := jwt.Sign(testSecret, "user-1", "user@myhobbees.fr", false, jwt.AudienceApp, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		principal, ok := AppPrincipalFrom(r.Context())
		if !ok {
			t.Fatal("expected app principal in context")
		}
		if principal.UserID != "user-1" {
			t.Fatalf("unexpected userID: %s", principal.UserID)
		}
		if principal.Email != "user@myhobbees.fr" {
			t.Fatalf("unexpected email: %s", principal.Email)
		}
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/app/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	AppMiddleware(next).ServeHTTP(rec, req)

	if !called {
		t.Fatal("expected next handler to be called")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestAppMiddleware_RejectsBackofficeAudienceToken(t *testing.T) {
	withSecret(t, testSecret)
	token, err := jwt.Sign(testSecret, "admin", "admin@myhobbees.fr", false, jwt.AudienceBackoffice, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	called := false
	next := okHandlerCalled(&called)

	req := httptest.NewRequest(http.MethodGet, "/v1/app/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	AppMiddleware(next).ServeHTTP(rec, req)

	if called {
		t.Fatal("next handler must not be called with a backoffice-audience token")
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

// TestMiddleware_EmptySecret reproduces the bypass: JWT_SECRET="" turns
// HS256 into an empty-key scheme that anyone can forge. The middleware must
// reject every request in this state, regardless of whether the attached
// token verifies.
func TestMiddleware_EmptySecret(t *testing.T) {
	withSecret(t, "")

	forged, err := jwt.Sign("", "admin", "attacker@evil.com", false, jwt.AudienceBackoffice, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	called := false
	next := okHandlerCalled(&called)

	req := httptest.NewRequest(http.MethodGet, "/v1/leads", nil)
	req.Header.Set("Authorization", "Bearer "+forged)
	rec := httptest.NewRecorder()

	Middleware(next).ServeHTTP(rec, req)

	if called {
		t.Fatal("next handler must not be called when JWT_SECRET is empty, even with a token forged against the empty key")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

// TestMiddleware_ShortSecret covers the case where JWT_SECRET is set but
// below the minimum strength: it must be treated the same as missing.
func TestMiddleware_ShortSecret(t *testing.T) {
	shortSecret := "too-short"
	withSecret(t, shortSecret)

	forged, err := jwt.Sign(shortSecret, "admin", "attacker@evil.com", false, jwt.AudienceBackoffice, time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	called := false
	next := okHandlerCalled(&called)

	req := httptest.NewRequest(http.MethodGet, "/v1/leads", nil)
	req.Header.Set("Authorization", "Bearer "+forged)
	rec := httptest.NewRecorder()

	Middleware(next).ServeHTTP(rec, req)

	if called {
		t.Fatal("next handler must not be called when JWT_SECRET is shorter than MinSecretBytes")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestRequireSuperAdmin_AllowsSuperAdmin(t *testing.T) {
	called := false
	next := okHandlerCalled(&called)

	req := httptest.NewRequest(http.MethodGet, "/v1/admins", nil)
	req = req.WithContext(context.WithValue(req.Context(), principalKey, Principal{
		Subject: "1", Email: "super@myhobbees.fr", IsSuperAdmin: true,
	}))
	rec := httptest.NewRecorder()

	RequireSuperAdmin(next).ServeHTTP(rec, req)

	if !called {
		t.Fatal("expected next handler to be called for a super-admin principal")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestRequireSuperAdmin_RejectsNonSuperAdmin(t *testing.T) {
	called := false
	next := okHandlerCalled(&called)

	req := httptest.NewRequest(http.MethodGet, "/v1/admins", nil)
	req = req.WithContext(context.WithValue(req.Context(), principalKey, Principal{
		Subject: "2", Email: "admin@myhobbees.fr", IsSuperAdmin: false,
	}))
	rec := httptest.NewRecorder()

	RequireSuperAdmin(next).ServeHTTP(rec, req)

	if called {
		t.Fatal("next handler must not be called for a non-super-admin principal")
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestRequireSuperAdmin_RejectsMissingPrincipal(t *testing.T) {
	called := false
	next := okHandlerCalled(&called)

	req := httptest.NewRequest(http.MethodGet, "/v1/admins", nil)
	rec := httptest.NewRecorder()

	RequireSuperAdmin(next).ServeHTTP(rec, req)

	if called {
		t.Fatal("next handler must not be called without a principal in context")
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestValidateSecret(t *testing.T) {
	cases := []struct {
		name    string
		secret  string
		wantErr bool
	}{
		{"empty", "", true},
		{"too short", "short-secret", true},
		{"exactly 31 bytes", strings.Repeat("a", 31), true},
		{"exactly 32 bytes", strings.Repeat("a", 32), false},
		{"valid", testSecret, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateSecret(tc.secret)
			if tc.wantErr && err == nil {
				t.Fatal("expected an error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}

// TestValidateShareSecret covers the exact-size contract CREDENTIAL_SHARE_SECRET
// has: unlike JWT_SECRET's "at least", AES-256-GCM needs precisely 32 bytes,
// so both 31 and 33 must be rejected just like empty.
func TestValidateShareSecret(t *testing.T) {
	cases := []struct {
		name    string
		secret  string
		wantErr bool
	}{
		{"empty", "", true},
		{"31 bytes", strings.Repeat("a", 31), true},
		{"32 bytes", strings.Repeat("a", 32), false},
		{"33 bytes", strings.Repeat("a", 33), true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateShareSecret(tc.secret)
			if tc.wantErr && err == nil {
				t.Fatal("expected an error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}
