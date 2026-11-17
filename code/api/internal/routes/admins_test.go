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

	// credential_shares is truncated alongside admins: creating an admin
	// via this pool now always inserts a row there too (migration
	// 003_create_credential_shares.sql).
	if _, err := pool.Exec(ctx, `TRUNCATE admins, credential_shares RESTART IDENTITY`); err != nil {
		t.Skipf("admins/credential_shares tables unavailable, run migrations 002 and 003: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `TRUNCATE admins, credential_shares RESTART IDENTITY`)
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

// adminsTestShareSecret must be exactly 32 bytes (AES-256-GCM): createAdmin
// now seals a credential-share token on every successful creation and
// refuses to run without a validly-sized CREDENTIAL_SHARE_SECRET.
const adminsTestShareSecret = "a-32-byte-secret-for-tests-ok!!!"

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
	t.Setenv("CREDENTIAL_SHARE_SECRET", adminsTestShareSecret)
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
		"email": "new-admin@myhobbees.fr",
	})
	defer res.Body.Close()
	raw, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", res.StatusCode, raw)
	}

	var decoded createAdminResponse
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if decoded.Admin.IsSuperAdmin {
		t.Error("expected isSuperAdmin=false by default")
	}
	if decoded.Admin.Email != "new-admin@myhobbees.fr" {
		t.Errorf("unexpected email: %s", decoded.Admin.Email)
	}
	if decoded.ShareToken == "" {
		t.Fatal("expected a non-empty shareToken")
	}
	if bytes.Contains(raw, []byte(`"password"`)) {
		t.Fatalf("response must never carry a plaintext password field: %s", raw)
	}
}

// TestAdmins_CreateIgnoresSubmittedPassword is the regression test for the
// Test Scope edge case "input POST /v1/admins avec un champ password": a
// client still sending one must never influence the real credential. Since
// createAdminBody has no Password field at all, a submitted one simply
// never reaches the handler — this asserts the request still succeeds
// (proving it wasn't rejected either) and still carries a server-generated
// shareToken.
func TestAdmins_CreateIgnoresSubmittedPassword(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := adminsServer(t)

	res := doJSON(t, http.MethodPost, srv.URL+"/", token, map[string]any{
		"email":    "client-supplied-password@myhobbees.fr",
		"password": "whatever-the-client-sends",
	})
	defer res.Body.Close()
	var decoded createAdminResponse
	if err := json.NewDecoder(res.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 even with a submitted password field, got %d", res.StatusCode)
	}
	if decoded.ShareToken == "" {
		t.Fatal("expected a server-generated shareToken regardless of the submitted password field")
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
		"email": "x@myhobbees.fr",
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
		"email": "taken@myhobbees.fr",
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

// TestAdmins_DuplicateEmailIsCaseInsensitive is the live-reproduced finding
// from the review: creating "Reviewer@Test.fr" after "reviewer@test.fr"
// must be rejected as the same mailbox, not create a second account that
// could outlive the deletion of the first.
func TestAdmins_DuplicateEmailIsCaseInsensitive(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	insertAdmin(t, pool, "reviewer@test.fr", false)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := adminsServer(t)

	res := doJSON(t, http.MethodPost, srv.URL+"/", token, map[string]any{
		"email": "Reviewer@Test.fr",
	})
	defer res.Body.Close()
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for a same-mailbox email differing only in case, got %d", res.StatusCode)
	}

	var count int
	err := pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM admins WHERE lower(email) = 'reviewer@test.fr'`).Scan(&count)
	if err != nil {
		t.Fatalf("count rows for this mailbox: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected exactly 1 stored row for this mailbox, got %d matches", count)
	}
}

// TestAdmins_CreateStoresEmailLowercased asserts the create endpoint itself
// normalizes case, independent of what findAdminByEmail is given.
func TestAdmins_CreateStoresEmailLowercased(t *testing.T) {
	pool := testAdminsPool(t)
	superID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	token := tokenFor(t, superID, "super@myhobbees.fr", true)
	srv := adminsServer(t)

	res := doJSON(t, http.MethodPost, srv.URL+"/", token, map[string]any{
		"email": "Mixed.Case@Myhobbees.fr",
	})
	defer res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201, got %d", res.StatusCode)
	}

	stored, err := findAdminByEmail(context.Background(), pool, "mixed.case@myhobbees.fr")
	if err != nil {
		t.Fatalf("find admin: %v", err)
	}
	if stored == nil {
		t.Fatal("expected the stored email to be lowercased")
	}
}

// TestAdmins_CreateGeneratesPasswordMeetingTheFloor asserts the
// server-generated password (generateStrongPassword) itself satisfies the
// length floor the client-supplied password used to be checked against —
// now enforced by construction, not by validating client input.
func TestAdmins_CreateGeneratesPasswordMeetingTheFloor(t *testing.T) {
	if generatedPasswordLength < 12 {
		t.Fatalf("generatedPasswordLength must be at least 12, got %d", generatedPasswordLength)
	}
	password, err := generateStrongPassword()
	if err != nil {
		t.Fatalf("generate password: %v", err)
	}
	if len(password) != generatedPasswordLength {
		t.Fatalf("expected a %d-character password, got %d", generatedPasswordLength, len(password))
	}
}

// TestAdmins_DeletedSuperAdminTokenIsRejectedLive is the direct regression
// test for review finding 1: a super-admin's JWT stays signature-valid for
// up to 24h after its row is deleted, but requireLiveSuperAdmin must
// re-check the database on every /v1/admins request and reject it, not
// just trust the claim set at sign time.
func TestAdmins_DeletedSuperAdminTokenIsRejectedLive(t *testing.T) {
	pool := testAdminsPool(t)
	remainingSuperID := insertAdmin(t, pool, "super@myhobbees.fr", true)
	removedID := insertAdmin(t, pool, "removed-super@myhobbees.fr", true)
	removedToken := tokenFor(t, removedID, "removed-super@myhobbees.fr", true)
	srv := adminsServer(t)

	remainingToken := tokenFor(t, remainingSuperID, "super@myhobbees.fr", true)
	delRes := doJSON(t, http.MethodDelete, adminURL(srv.URL, removedID), remainingToken, nil)
	delRes.Body.Close()
	if delRes.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 deleting the second super admin, got %d", delRes.StatusCode)
	}

	// The removed admin's token is still signature-valid (not expired, not
	// forged) and still claims isSuperAdmin=true: only the live DB check
	// can catch that its row is gone.
	listRes := doJSON(t, http.MethodGet, srv.URL+"/", removedToken, nil)
	defer listRes.Body.Close()
	if listRes.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 for a deleted super admin's still-valid token, got %d", listRes.StatusCode)
	}

	// The same old token must not be able to recreate itself as a
	// super-admin either — the exact self-reinstatement the review caught
	// live.
	recreateRes := doJSON(t, http.MethodPost, srv.URL+"/", removedToken, map[string]any{
		"email": "removed-super@myhobbees.fr", "isSuperAdmin": true,
	})
	defer recreateRes.Body.Close()
	if recreateRes.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 when a deleted super admin's token tries to recreate itself, got %d", recreateRes.StatusCode)
	}
}
