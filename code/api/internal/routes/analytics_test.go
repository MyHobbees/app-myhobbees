package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/jwt"
)

// Analytics() no longer applies auth.Middleware itself: that single
// responsibility now lives in app.go's protected /v1 group (see
// aidd_docs/tasks/.../review.md, double-auth finding). Tests here wrap it
// the same way app.go does, so they still exercise the real composition.
// The "no token at all" case is covered end-to-end in
// internal/app/app_test.go, which is where the fail-closed guarantee
// actually lives now.

func TestAnalytics_PostHogNotConfigured(t *testing.T) {
	secret := "test-secret-at-least-32-characters-long"
	t.Setenv("JWT_SECRET", secret)
	t.Setenv("POSTHOG_PERSONAL_API_KEY", "")
	t.Setenv("POSTHOG_PROJECT_ID", "")

	token, err := jwt.Sign(secret, "admin", "admin@myhobbees.fr", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	srv := httptest.NewServer(auth.Middleware(Analytics()))
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
