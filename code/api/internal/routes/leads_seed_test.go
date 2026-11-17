package routes

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// insertRealTestLead inserts a lead that does NOT match the seed email
// pattern, to prove CleanupSeedLeads never touches a genuine signup.
func insertRealTestLead(t *testing.T) int64 {
	t.Helper()
	pool := testLeadsPool(t)
	ctx := context.Background()

	email := fmt.Sprintf("real-lead-%d@myhobbees.fr", time.Now().UnixNano())
	var id int64
	err := pool.QueryRow(ctx, `
		INSERT INTO leads (email, activities, acquisition_channel, subscription_interest)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, email, []string{"Crochet"}, "Instagram", "box-creative").Scan(&id)
	if err != nil {
		t.Fatalf("insert real test lead: %v", err)
	}
	t.Cleanup(func() {
		if _, err := pool.Exec(context.Background(), "DELETE FROM leads WHERE id = $1", id); err != nil {
			t.Logf("cleanup real lead %d: %v", id, err)
		}
	})
	return id
}

func countLeadsByID(t *testing.T, id int64) int {
	t.Helper()
	pool := testLeadsPool(t)
	var count int
	if err := pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM leads WHERE id = $1`, id).Scan(&count); err != nil {
		t.Fatalf("count lead %d: %v", id, err)
	}
	return count
}

func countSeedLeads(t *testing.T) int {
	t.Helper()
	pool := testLeadsPool(t)
	var count int
	if err := pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM leads WHERE email LIKE $1`, seedEmailPattern).Scan(&count); err != nil {
		t.Fatalf("count seed leads: %v", err)
	}
	return count
}

func doSeedLeads(countParam string) *httptest.ResponseRecorder {
	url := "/v1/leads/seed"
	if countParam != "" {
		url += "?count=" + countParam
	}
	req := httptest.NewRequest(http.MethodPost, url, nil)
	rec := httptest.NewRecorder()
	SeedLeads(rec, req)
	return rec
}

func doCleanupSeedLeads() *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodDelete, "/v1/leads/seed", nil)
	rec := httptest.NewRecorder()
	CleanupSeedLeads(rec, req)
	return rec
}

// TestSeedLeads_HappyPath_SeedsThenCleansUpWithoutTouchingRealLeads covers
// the Test Scope's happy path: on stg, POST creates exactly `count` rows
// recognizable by the seed- email pattern, and DELETE removes exactly
// those rows while a pre-existing real lead survives untouched.
func TestSeedLeads_HappyPath_SeedsThenCleansUpWithoutTouchingRealLeads(t *testing.T) {
	t.Setenv("APP_ENV", "stg")
	realID := insertRealTestLead(t)
	before := countSeedLeads(t)

	rec := doSeedLeads("5")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 seeding on stg, got %d: %s", rec.Code, rec.Body.String())
	}
	var seedResult struct {
		Created int `json:"created"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &seedResult); err != nil {
		t.Fatalf("decode seed response: %v", err)
	}
	if seedResult.Created != 5 {
		t.Fatalf("expected created=5, got %d", seedResult.Created)
	}
	if got := countSeedLeads(t); got != before+5 {
		t.Fatalf("expected %d seeded leads after insert, got %d", before+5, got)
	}
	if countLeadsByID(t, realID) != 1 {
		t.Fatalf("real lead %d must survive the seed", realID)
	}

	cleanupRec := doCleanupSeedLeads()
	if cleanupRec.Code != http.StatusOK {
		t.Fatalf("expected 200 cleaning up on stg, got %d: %s", cleanupRec.Code, cleanupRec.Body.String())
	}
	var cleanupResult struct {
		Deleted int64 `json:"deleted"`
	}
	if err := json.Unmarshal(cleanupRec.Body.Bytes(), &cleanupResult); err != nil {
		t.Fatalf("decode cleanup response: %v", err)
	}
	if cleanupResult.Deleted != int64(before)+5 {
		t.Fatalf("expected deleted=%d, got %d", before+5, cleanupResult.Deleted)
	}
	if got := countSeedLeads(t); got != 0 {
		t.Fatalf("expected 0 seed leads left after cleanup, got %d", got)
	}
	if countLeadsByID(t, realID) != 1 {
		t.Fatalf("real lead %d must survive the cleanup", realID)
	}
}

// TestSeedLeads_DataIsVaried is the regression test for the review's
// warning: seeded rows used to all share one created_at, carry exactly one
// activity each, and never fill utm_*/referrer, making countLeadsSince's
// day-window stat and the "Source" column always degenerate for seeded
// data. A reasonably large batch must show variety on all three axes.
func TestSeedLeads_DataIsVaried(t *testing.T) {
	t.Setenv("APP_ENV", "stg")
	pool := testLeadsPool(t)
	ctx := context.Background()

	rec := doSeedLeads("20")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 seeding, got %d: %s", rec.Code, rec.Body.String())
	}
	t.Cleanup(func() {
		doCleanupSeedLeads()
	})

	var distinctDates int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT created_at::date) FROM leads WHERE email LIKE $1
	`, seedEmailPattern).Scan(&distinctDates); err != nil {
		t.Fatalf("count distinct dates: %v", err)
	}
	if distinctDates < 2 {
		t.Fatalf("expected seeded leads spread over more than 1 day, got %d distinct day(s)", distinctDates)
	}

	var singleActivityCount, totalCount int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FILTER (WHERE array_length(activities, 1) = 1), COUNT(*)
		FROM leads WHERE email LIKE $1
	`, seedEmailPattern).Scan(&singleActivityCount, &totalCount); err != nil {
		t.Fatalf("count activities lengths: %v", err)
	}
	if singleActivityCount == totalCount {
		t.Fatalf("expected some seeded leads to have more than 1 activity, all %d had exactly 1", totalCount)
	}

	var withUTM, withoutUTM int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FILTER (WHERE utm_source IS NOT NULL), COUNT(*) FILTER (WHERE utm_source IS NULL)
		FROM leads WHERE email LIKE $1
	`, seedEmailPattern).Scan(&withUTM, &withoutUTM); err != nil {
		t.Fatalf("count utm_source presence: %v", err)
	}
	if withUTM == 0 {
		t.Fatalf("expected at least one seeded lead with utm_source filled, got none")
	}
	if withoutUTM == 0 {
		t.Fatalf("expected at least one seeded lead without utm_source, got none (all filled)")
	}
}

// TestSeedLeads_WrongEnvironment_Returns403AndTouchesNothing covers the
// Test Scope's "mauvais environnement" edge case: both loc and prd must be
// rejected with 403 on both the seed and cleanup routes, and no row may be
// inserted or deleted.
func TestSeedLeads_WrongEnvironment_Returns403AndTouchesNothing(t *testing.T) {
	for _, env := range []string{"loc", "prd"} {
		t.Run(env, func(t *testing.T) {
			t.Setenv("APP_ENV", env)
			before := countSeedLeads(t)

			seedRec := doSeedLeads("3")
			if seedRec.Code != http.StatusForbidden {
				t.Fatalf("expected 403 seeding under APP_ENV=%s, got %d", env, seedRec.Code)
			}

			cleanupRec := doCleanupSeedLeads()
			if cleanupRec.Code != http.StatusForbidden {
				t.Fatalf("expected 403 cleaning up under APP_ENV=%s, got %d", env, cleanupRec.Code)
			}

			if got := countSeedLeads(t); got != before {
				t.Fatalf("expected no row touched under APP_ENV=%s, before=%d after=%d", env, before, got)
			}
		})
	}
}

// TestSeedLeads_CountBounds covers the Test Scope's "count hors bornes"
// edge case: 0, 101, and a non-numeric value must all be rejected with a
// loud 400, never a silent seed of 0 or an unreasonably large batch;
// omitting count entirely must fall back to a reasonable default.
func TestSeedLeads_CountBounds(t *testing.T) {
	t.Setenv("APP_ENV", "stg")

	for _, countParam := range []string{"0", "101", "not-a-number"} {
		t.Run(countParam, func(t *testing.T) {
			before := countSeedLeads(t)
			rec := doSeedLeads(countParam)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400 for count=%s, got %d", countParam, rec.Code)
			}
			if got := countSeedLeads(t); got != before {
				t.Fatalf("count=%s must not insert anything: before=%d after=%d", countParam, before, got)
			}
		})
	}

	t.Run("absent falls back to a default", func(t *testing.T) {
		rec := doSeedLeads("")
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 with no count param, got %d: %s", rec.Code, rec.Body.String())
		}
		var seedResult struct {
			Created int `json:"created"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &seedResult); err != nil {
			t.Fatalf("decode seed response: %v", err)
		}
		if seedResult.Created <= 0 {
			t.Fatalf("expected a positive default count, got %d", seedResult.Created)
		}
		cleanupRec := doCleanupSeedLeads()
		if cleanupRec.Code != http.StatusOK {
			t.Fatalf("expected 200 cleaning up, got %d", cleanupRec.Code)
		}
	})
}
