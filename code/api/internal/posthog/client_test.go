package posthog

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClient_Query(t *testing.T) {
	var gotAuth, gotPath string
	var gotBody map[string]any

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotPath = r.URL.Path
		_ = json.NewDecoder(r.Body).Decode(&gotBody)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"columns": []string{"day", "count"},
			"results": [][]any{
				{"2026-11-01", 3},
				{"2026-11-02", 5},
			},
		})
	}))
	defer srv.Close()

	client := &Client{
		host:      srv.URL,
		projectID: "337481",
		apiKey:    "phx_test",
		http:      srv.Client(),
	}

	result, err := client.Query(context.Background(), "SELECT toDate(timestamp) as day, count() FROM events GROUP BY day")
	if err != nil {
		t.Fatalf("query: %v", err)
	}

	if gotAuth != "Bearer phx_test" {
		t.Fatalf("unexpected Authorization header: %s", gotAuth)
	}
	if gotPath != "/api/projects/337481/query/" {
		t.Fatalf("unexpected path: %s", gotPath)
	}
	query, _ := gotBody["query"].(map[string]any)
	if query["kind"] != "HogQLQuery" {
		t.Fatalf("expected HogQLQuery kind, got %v", query["kind"])
	}

	if len(result.Columns) != 2 || len(result.Results) != 2 {
		t.Fatalf("unexpected result shape: %+v", result)
	}
	if result.Results[1][1] != float64(5) {
		t.Fatalf("expected second row count 5, got %v", result.Results[1][1])
	}
}

func TestClient_Query_HTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	client := &Client{
		host:      srv.URL,
		projectID: "337481",
		apiKey:    "bad-key",
		http:      srv.Client(),
	}

	if _, err := client.Query(context.Background(), "SELECT 1"); err == nil {
		t.Fatal("expected an error for a non-200 response")
	}
}

func TestFromEnv_NotConfigured(t *testing.T) {
	t.Setenv("POSTHOG_PERSONAL_API_KEY", "")
	t.Setenv("POSTHOG_PROJECT_ID", "")

	if _, err := FromEnv(); err != ErrNotConfigured {
		t.Fatalf("expected ErrNotConfigured, got %v", err)
	}
}
