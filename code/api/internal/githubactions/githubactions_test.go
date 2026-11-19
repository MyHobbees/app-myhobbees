package githubactions

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func withTestServer(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	original := APIBaseURL
	APIBaseURL = srv.URL
	t.Cleanup(func() { APIBaseURL = original })

	return srv
}

func TestTriggerWorkflow_Success204(t *testing.T) {
	var gotAuth, gotPath, gotAccept, gotAPIVersion string
	srv := withTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotPath = r.URL.Path
		gotAccept = r.Header.Get("Accept")
		gotAPIVersion = r.Header.Get("X-GitHub-Api-Version")
		w.WriteHeader(http.StatusNoContent)
	})

	err := TriggerWorkflow(context.Background(), srv.Client(), "test-token", "MyHobbees", "app-myhobbees", "migrate-stg-on-demand.yml", "dev")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if gotAuth != "Bearer test-token" {
		t.Fatalf("unexpected Authorization header: %q", gotAuth)
	}
	if gotPath != "/repos/MyHobbees/app-myhobbees/actions/workflows/migrate-stg-on-demand.yml/dispatches" {
		t.Fatalf("unexpected path: %q", gotPath)
	}
	if gotAccept != "application/vnd.github+json" {
		t.Fatalf("unexpected Accept header: %q", gotAccept)
	}
	if gotAPIVersion != "2022-11-28" {
		t.Fatalf("unexpected X-GitHub-Api-Version header: %q", gotAPIVersion)
	}
}

func TestTriggerWorkflow_Success200WithBody(t *testing.T) {
	// GitHub's spec also documents a 200 with a JSON body when the caller
	// requests return_run_details; this call never sets that, but a
	// robust client must not hardcode 204 as the only accepted code.
	srv := withTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":1}`))
	})

	err := TriggerWorkflow(context.Background(), srv.Client(), "test-token", "owner", "repo", "wf.yml", "dev")
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
}

func TestTriggerWorkflow_Unauthorized(t *testing.T) {
	srv := withTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"message":"Bad credentials"}`))
	})

	err := TriggerWorkflow(context.Background(), srv.Client(), "bad-token", "owner", "repo", "wf.yml", "dev")
	if !errors.Is(err, ErrDispatchFailed) {
		t.Fatalf("expected ErrDispatchFailed, got %v", err)
	}
}

func TestTriggerWorkflow_NotFoundEmptyBody(t *testing.T) {
	srv := withTestServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})

	err := TriggerWorkflow(context.Background(), srv.Client(), "test-token", "owner", "repo", "wf.yml", "dev")
	if !errors.Is(err, ErrDispatchFailed) {
		t.Fatalf("expected ErrDispatchFailed, got %v", err)
	}
}
