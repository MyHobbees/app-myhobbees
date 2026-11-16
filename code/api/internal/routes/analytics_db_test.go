package routes

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/myhobbees/api/internal/db"
)

// testLeadsPool points db.Pool at the local dev Postgres (see code/api/.env
// and docker-compose.yml's postgres service) and skips the test outright if
// it cannot be reached, rather than failing the whole suite when a developer
// runs `go test ./...` without the dev stack up.
//
// This exercises countLeadsSince against a real database on purpose: the
// regression it guards against (analytics.go's $1 being inferred as text,
// which pgx cannot encode a Go int into) only ever showed up against a real
// Postgres planner, never against a mock or in `go vet`.
func testLeadsPool(t *testing.T) *pgxpool.Pool {
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
	return pool
}

func insertTestLead(t *testing.T, pool *pgxpool.Pool, createdAt time.Time) int64 {
	t.Helper()
	ctx := context.Background()

	email := fmt.Sprintf("countleadssince-%d@test.invalid", time.Now().UnixNano())
	var id int64
	err := pool.QueryRow(ctx, `
		INSERT INTO leads (email, activities, acquisition_channel, subscription_interest, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, email, []string{"peinture"}, "test", "box-creative", createdAt).Scan(&id)
	if err != nil {
		t.Fatalf("insert test lead: %v", err)
	}
	t.Cleanup(func() {
		if _, err := pool.Exec(context.Background(), "DELETE FROM leads WHERE id = $1", id); err != nil {
			t.Logf("cleanup lead %d: %v", id, err)
		}
	})
	return id
}

// TestCountLeadsSince_DoesNotErrorAgainstRealDatabase is the direct
// regression test for the $1-inferred-as-text bug: it must pass for every
// period the back-office actually requests (7/30/90), against a real
// Postgres instance, not a mock. Before the fix, every one of these calls
// returned "unable to encode N into text format for text (OID 25)".
func TestCountLeadsSince_DoesNotErrorAgainstRealDatabase(t *testing.T) {
	pool := testLeadsPool(t)
	insertTestLead(t, pool, time.Now())

	for _, days := range []int{7, 30, 90} {
		t.Run(fmt.Sprintf("days=%d", days), func(t *testing.T) {
			count, err := countLeadsSince(context.Background(), days)
			if err != nil {
				t.Fatalf("countLeadsSince(%d) against a real database: %v", days, err)
			}
			if count < 1 {
				t.Fatalf("expected at least the just-inserted lead within %d days, got count=%d", days, count)
			}
		})
	}
}

// TestCountLeadsSince_WindowIsInDays confirms the fixed query still filters
// by days, not some other unit: a lead from 120 days ago must not count in a
// 90-day window, while one from today must count in a 7-day window.
func TestCountLeadsSince_WindowIsInDays(t *testing.T) {
	pool := testLeadsPool(t)

	before, err := countLeadsSince(context.Background(), 90)
	if err != nil {
		t.Fatalf("countLeadsSince(90) baseline: %v", err)
	}

	insertTestLead(t, pool, time.Now().Add(-120*24*time.Hour))

	after, err := countLeadsSince(context.Background(), 90)
	if err != nil {
		t.Fatalf("countLeadsSince(90) after inserting an old lead: %v", err)
	}
	if after != before {
		t.Fatalf("a lead created 120 days ago must not count in a 90-day window: before=%d after=%d", before, after)
	}

	insertTestLead(t, pool, time.Now())

	afterRecent, err := countLeadsSince(context.Background(), 7)
	if err != nil {
		t.Fatalf("countLeadsSince(7) after inserting a recent lead: %v", err)
	}
	if afterRecent < 1 {
		t.Fatalf("expected at least the just-inserted lead within 7 days, got count=%d", afterRecent)
	}
}
