package routes

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/db"
	"github.com/myhobbees/api/internal/jwt"
)

// testAdminsPool points db.Pool at the local dev Postgres (see
// analytics_db_test.go for the same pattern) and skips the test outright if
// it cannot be reached. Every test using it starts by truncating admins, so
// tests never see leftovers from a previous run or from bootstrapFirstSuperAdmin
// having already run once against this same local database.
func testAdminsPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	t.Setenv("DB_HOST", "localhost")
	t.Setenv("DB_PORT", "5433")
	t.Setenv("DB_NAME", "myhobbees_loc")
	t.Setenv("DB_USERNAME", "myhobbees")
	t.Setenv("DB_PASSWORD", "myhobbees")
	t.Setenv("DB_SSLMODE", "disable")

	ctx := context.Background()
	pool, err := db.Pool(ctx)
	if err != nil {
		t.Skipf("local dev postgres unavailable (run `docker compose up postgres`): %v", err)
	}
	if err := pool.Ping(ctx); err != nil {
		t.Skipf("local dev postgres unreachable (run `docker compose up postgres`): %v", err)
	}

	if _, err := pool.Exec(ctx, `TRUNCATE admins RESTART IDENTITY`); err != nil {
		t.Skipf("admins table unavailable, run migration 002_create_admins.sql: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `TRUNCATE admins RESTART IDENTITY`)
	})

	return pool
}

func countAdmins(t *testing.T, pool *pgxpool.Pool) int {
	t.Helper()
	var count int
	if err := pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM admins`).Scan(&count); err != nil {
		t.Fatalf("count admins: %v", err)
	}
	return count
}

func TestBootstrapFirstSuperAdmin_EmptyTableWithEnvInsertsOneRow(t *testing.T) {
	pool := testAdminsPool(t)
	t.Setenv("ADMIN_EMAIL", "bootstrap@myhobbees.fr")
	t.Setenv("ADMIN_PASSWORD_HASH", "$2y$10$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvabcdefgh")

	if err := bootstrapFirstSuperAdmin(context.Background(), pool); err != nil {
		t.Fatalf("bootstrap: %v", err)
	}

	if got := countAdmins(t, pool); got != 1 {
		t.Fatalf("expected 1 admin after bootstrap, got %d", got)
	}

	a, err := findAdminByEmail(context.Background(), pool, "bootstrap@myhobbees.fr")
	if err != nil {
		t.Fatalf("find admin: %v", err)
	}
	if a == nil {
		t.Fatal("expected bootstrapped admin to be findable by email")
	}
	if !a.IsSuperAdmin {
		t.Error("bootstrapped admin must be a super admin")
	}
}

func TestBootstrapFirstSuperAdmin_AlreadyPopulatedIsNoOp(t *testing.T) {
	pool := testAdminsPool(t)
	t.Setenv("ADMIN_EMAIL", "bootstrap@myhobbees.fr")
	t.Setenv("ADMIN_PASSWORD_HASH", "$2y$10$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvabcdefgh")

	if err := bootstrapFirstSuperAdmin(context.Background(), pool); err != nil {
		t.Fatalf("first bootstrap: %v", err)
	}
	if err := bootstrapFirstSuperAdmin(context.Background(), pool); err != nil {
		t.Fatalf("second bootstrap: %v", err)
	}

	if got := countAdmins(t, pool); got != 1 {
		t.Fatalf("expected exactly 1 admin after calling bootstrap twice, got %d", got)
	}
}

func TestBootstrapFirstSuperAdmin_NoEnvVarsIsNoOp(t *testing.T) {
	pool := testAdminsPool(t)
	t.Setenv("ADMIN_EMAIL", "")
	t.Setenv("ADMIN_PASSWORD_HASH", "")

	if err := bootstrapFirstSuperAdmin(context.Background(), pool); err != nil {
		t.Fatalf("bootstrap with no env vars must not error, got: %v", err)
	}

	if got := countAdmins(t, pool); got != 0 {
		t.Fatalf("expected 0 admins when env vars are absent and table is empty, got %d", got)
	}
}

// --- Admins() endpoints (phase 2) ---

const adminsTestJWTSecret = "test-secret-at-least-32-characters-long"

// insertAdmin inserts an admin row directly (bypassing bootstrap/create so
// the caller controls the id) and returns its real id, used to build a
// matching JWT subject.
func insertAdmin(t *testing.T, pool *pgxpool.Pool, email string, isSuperAdmin bool) int64 {
	t.Helper()
	var id int64
	err := pool.QueryRow(context.Background(), `
		INSERT INTO admins (email, password_hash, is_super_admin)
		VALUES ($1, $2, $3)
		RETURNING id
	`, email, bcryptHash(t, "whatever"), isSuperAdmin).Scan(&id)
	if err != nil {
		t.Fatalf("insert admin: %v", err)
	}
	return id
}

// adminsServer wires Admins() the same way app.go does: auth.Middleware
// first (populates the Principal from the JWT), then auth.RequireSuperAdmin.
func adminsServer(t *testing.T) *httptest.Server {
	t.Helper()
	t.Setenv("JWT_SECRET", adminsTestJWTSecret)
	srv := httptest.NewServer(auth.Middleware(auth.RequireSuperAdmin(Admins())))
	t.Cleanup(srv.Close)
	return srv
}

func tokenFor(t *testing.T, id int64, email string, isSuperAdmin bool) string {
	t.Helper()
	token, err := jwt.Sign(adminsTestJWTSecret, strconv.FormatInt(id, 10), email, isSuperAdmin, time.Hour)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return token
}

// adminURL builds the DELETE /{id} URL for a given admin id.
func adminURL(base string, id int64) string {
	return base + "/" + strconv.FormatInt(id, 10)
}

func doJSON(t *testing.T, method, url, token string, body any) *http.Response {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		reader = bytes.NewReader(b)
	} else {
		reader = bytes.NewReader(nil)
	}
	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do request: %v", err)
	}
	return res
}

func TestAdmins_CreateSucceeds(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := adminsServer(t)

	res := doJSON(t, http.MethodPost, srv.URL+"/", token, map[string]any{
		"email":    "new-admin@myhobbees.fr",
		"password": "a-strong-password",
	})
	defer res.Body.Close()
	var created adminJSON
	if err := json.NewDecoder(res.Body).Decode(&created); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201, got %d", res.StatusCode)
	}
	if created.IsSuperAdmin {
		t.Error("expected isSuperAdmin=false by default")
	}
	if created.Email != "new-admin@myhobbees.fr" {
		t.Errorf("unexpected email: %s", created.Email)
	}
}

func TestAdmins_ListNeverIncludesPasswordHash(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	insertAdmin(t, pool, "second@myhobbees.fr", false)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := adminsServer(t)

	res := doJSON(t, http.MethodGet, srv.URL+"/", token, nil)
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.StatusCode)
	}
	raw, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	if bytes.Contains(raw, []byte("password")) {
		t.Fatalf("response must never include password_hash: %s", raw)
	}
	var list []adminJSON
	if err := json.Unmarshal(raw, &list); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("expected 2 admins, got %d", len(list))
	}
}

func TestAdmins_DeleteRemovesTarget(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	targetID := insertAdmin(t, pool, "second@myhobbees.fr", false)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := adminsServer(t)

	res := doJSON(t, http.MethodDelete, adminURL(srv.URL, targetID), token, nil)
	defer res.Body.Close()
	if res.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", res.StatusCode)
	}

	remaining, err := findAdminByEmail(context.Background(), pool, "second@myhobbees.fr")
	if err != nil {
		t.Fatalf("find admin: %v", err)
	}
	if remaining != nil {
		t.Fatal("expected deleted admin to be gone")
	}
}

func TestAdmins_NonSuperAdminIsForbiddenOnAllThreeEndpoints(t *testing.T) {
	pool := testAdminsPool(t)
	normalID := insertAdmin(t, pool, "normal@myhobbees.fr", false)
	otherID := insertAdmin(t, pool, "other@myhobbees.fr", false)
	token := tokenFor(t, normalID, "normal@myhobbees.fr", false)
	srv := adminsServer(t)

	createRes := doJSON(t, http.MethodPost, srv.URL+"/", token, map[string]any{
		"email": "x@myhobbees.fr", "password": "whatever",
	})
	if createRes.StatusCode != http.StatusForbidden {
		t.Errorf("POST: expected 403, got %d", createRes.StatusCode)
	}
	createRes.Body.Close()

	listRes := doJSON(t, http.MethodGet, srv.URL+"/", token, nil)
	if listRes.StatusCode != http.StatusForbidden {
		t.Errorf("GET: expected 403, got %d", listRes.StatusCode)
	}
	listRes.Body.Close()

	deleteRes := doJSON(t, http.MethodDelete, adminURL(srv.URL, otherID), token, nil)
	if deleteRes.StatusCode != http.StatusForbidden {
		t.Errorf("DELETE: expected 403, got %d", deleteRes.StatusCode)
	}
	deleteRes.Body.Close()
}

func TestAdmins_CannotDeleteSelf(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	insertAdmin(t, pool, "second-super@myhobbees.fr", true)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := adminsServer(t)

	res := doJSON(t, http.MethodDelete, adminURL(srv.URL, superID), token, nil)
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", res.StatusCode)
	}

	still, err := findAdminByEmail(context.Background(), pool, "super@myhobbees.fr")
	if err != nil {
		t.Fatalf("find admin: %v", err)
	}
	if still == nil {
		t.Fatal("expected self to still exist in the database")
	}
}

// TestAdmins_CannotDeleteLastSuperAdmin covers the edge case from the
// plan's Test Scope: the only super-admin in the system can never be
// deleted, and the admins table must never end up with 0 super-admins.
//
// Given RequireSuperAdmin only lets super-admins call this endpoint at
// all, when exactly one super-admin exists that actor can only ever be
// the target itself — this scenario is structurally the same request as
// the self-delete one, and the self-delete guard (checked first, per the
// plan's own task order) is what actually answers it. Both guards exist
// independently in admins.go; this test asserts the invariant they
// jointly protect (never 0 super-admins), not which message wins.
func TestAdmins_CannotDeleteLastSuperAdmin(t *testing.T) {
	pool := testAdminsPool(t)
	onlySuperID := insertAdmin(t, pool, "only-super@myhobbees.fr", true)
	insertAdmin(t, pool, "normal@myhobbees.fr", false)
	token := tokenFor(t, onlySuperID, "only-super@myhobbees.fr", true)
	srv := adminsServer(t)

	res := doJSON(t, http.MethodDelete, adminURL(srv.URL, onlySuperID), token, nil)
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 when deleting the only super admin, got %d", res.StatusCode)
	}

	count, err := countSuperAdmins(context.Background(), pool)
	if err != nil {
		t.Fatalf("count super admins: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected the admins table to still have exactly 1 super admin, got %d", count)
	}
}

func TestAdmins_DuplicateEmailReturnsExplicit400NotRaw500(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	insertAdmin(t, pool, "taken@myhobbees.fr", false)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := adminsServer(t)

	res := doJSON(t, http.MethodPost, srv.URL+"/", token, map[string]any{
		"email": "taken@myhobbees.fr", "password": "whatever",
	})
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for a duplicate email, got %d", res.StatusCode)
	}
	var decoded map[string]string
	if err := json.NewDecoder(res.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if decoded["error"] == "" {
		t.Fatal("expected a human-readable error message, not an empty/raw body")
	}
}
