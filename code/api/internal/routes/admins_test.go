package routes

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/myhobbees/api/internal/db"
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
