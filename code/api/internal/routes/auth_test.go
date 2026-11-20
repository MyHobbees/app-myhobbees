package routes

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"github.com/myhobbees/api/internal/jwt"
)

// bcryptHash hashes password at bcrypt's minimum cost, fast enough to run
// on every test without slowing the suite down the way bcrypt.DefaultCost
// would.
func bcryptHash(t *testing.T, password string) string {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("bcrypt hash: %v", err)
	}
	return string(hash)
}

// Login used to be checked against the ADMIN_EMAIL/ADMIN_PASSWORD_HASH env
// pair directly; it now goes through the real admins table, bootstrapping
// the first super-admin from those same env vars when the table is empty.
// These tests drive that table (see testAdminsPool in admins_test.go), not
// a mock, the same way analytics_db_test.go exercises a real Postgres.

const testJWTSecret = "test-secret-at-least-32-characters-long"

func loginRequest(t *testing.T, srv *httptest.Server, email, password string) (*http.Response, map[string]any) {
	t.Helper()
	body, _ := json.Marshal(map[string]string{"email": email, "password": password})
	res, err := http.Post(srv.URL+"/login", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("post /login: %v", err)
	}
	defer res.Body.Close()
	var decoded map[string]any
	if err := json.NewDecoder(res.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return res, decoded
}

func TestLogin_BootstrapsAndSucceeds(t *testing.T) {
	pool := testAdminsPool(t)
	t.Setenv("JWT_SECRET", testJWTSecret)
	t.Setenv("ADMIN_EMAIL", "super@myhobbees.fr")
	t.Setenv("ADMIN_PASSWORD_HASH", bcryptHash(t, "correct horse"))

	srv := httptest.NewServer(Auth())
	defer srv.Close()

	res, decoded := loginRequest(t, srv, "super@myhobbees.fr", "correct horse")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d (%v)", res.StatusCode, decoded)
	}
	if decoded["isSuperAdmin"] != true {
		t.Fatalf("expected isSuperAdmin=true, got %v", decoded["isSuperAdmin"])
	}
	token, _ := decoded["token"].(string)
	if token == "" {
		t.Fatal("expected a non-empty token")
	}

	claims, err := jwt.Verify(testJWTSecret, token, jwt.AudienceBackoffice)
	if err != nil {
		t.Fatalf("verify issued token: %v", err)
	}
	if claims.Subject == "admin" || claims.Subject == "" {
		t.Fatalf("expected sub to be the admin's real id, got %q", claims.Subject)
	}
	if !claims.IsSuperAdmin {
		t.Fatal("expected issued token to carry isSuperAdmin=true")
	}

	if got := countAdmins(t, pool); got != 1 {
		t.Fatalf("expected exactly 1 admin after bootstrap, got %d", got)
	}
}

func TestLogin_SecondCallIsIdempotent(t *testing.T) {
	pool := testAdminsPool(t)
	t.Setenv("JWT_SECRET", testJWTSecret)
	t.Setenv("ADMIN_EMAIL", "super@myhobbees.fr")
	t.Setenv("ADMIN_PASSWORD_HASH", bcryptHash(t, "correct horse"))

	srv := httptest.NewServer(Auth())
	defer srv.Close()

	res1, _ := loginRequest(t, srv, "super@myhobbees.fr", "correct horse")
	if res1.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on first login, got %d", res1.StatusCode)
	}
	res2, _ := loginRequest(t, srv, "super@myhobbees.fr", "correct horse")
	if res2.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on second login, got %d", res2.StatusCode)
	}

	if got := countAdmins(t, pool); got != 1 {
		t.Fatalf("expected exactly 1 admin after calling login twice, got %d", got)
	}
}

func TestLogin_WrongPasswordIsUnauthorized(t *testing.T) {
	testAdminsPool(t)
	t.Setenv("JWT_SECRET", testJWTSecret)
	t.Setenv("ADMIN_EMAIL", "super@myhobbees.fr")
	t.Setenv("ADMIN_PASSWORD_HASH", bcryptHash(t, "correct horse"))

	srv := httptest.NewServer(Auth())
	defer srv.Close()

	res, _ := loginRequest(t, srv, "super@myhobbees.fr", "wrong password")
	if res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for wrong password, got %d", res.StatusCode)
	}
}

// TestLogin_EmailIsTrimmedAndCaseInsensitive covers two review findings at
// once: login must accept trailing whitespace the way create already did
// (asymmetry finding), and it must treat differently-cased emails as the
// same mailbox (case-sensitivity finding) rather than failing to find a
// row that was stored lowercased.
func TestLogin_EmailIsTrimmedAndCaseInsensitive(t *testing.T) {
	testAdminsPool(t)
	t.Setenv("JWT_SECRET", testJWTSecret)
	t.Setenv("ADMIN_EMAIL", "super@myhobbees.fr")
	t.Setenv("ADMIN_PASSWORD_HASH", bcryptHash(t, "correct horse"))

	srv := httptest.NewServer(Auth())
	defer srv.Close()

	res, decoded := loginRequest(t, srv, "  Super@MyHobbees.fr  ", "correct horse")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for a padded/mixed-case email, got %d (%v)", res.StatusCode, decoded)
	}
}

func TestLogin_NoEnvVarsAndEmptyTableIsUnauthorizedNotPanic(t *testing.T) {
	testAdminsPool(t)
	t.Setenv("JWT_SECRET", testJWTSecret)
	t.Setenv("ADMIN_EMAIL", "")
	t.Setenv("ADMIN_PASSWORD_HASH", "")

	srv := httptest.NewServer(Auth())
	defer srv.Close()

	res, _ := loginRequest(t, srv, "whoever@myhobbees.fr", "whatever")
	if res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", res.StatusCode)
	}
}
