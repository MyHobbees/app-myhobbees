// Package posthog is a minimal server-side client for PostHog's HogQL query API.
package posthog

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"
)

// ErrNotConfigured is returned when the required PostHog env vars are missing.
var ErrNotConfigured = errors.New("posthog not configured")

const defaultHost = "https://eu.posthog.com"

// Client executes HogQL queries against a single PostHog project, authenticated
// with a Personal API Key. This key has account-wide scope, so it is only ever
// read from the server's environment, never exposed to a browser client.
type Client struct {
	host      string
	projectID string
	apiKey    string
	http      *http.Client
}

// FromEnv builds a Client from POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID,
// and POSTHOG_HOST (defaulting to the EU Cloud host).
func FromEnv() (*Client, error) {
	apiKey := os.Getenv("POSTHOG_PERSONAL_API_KEY")
	projectID := os.Getenv("POSTHOG_PROJECT_ID")
	if apiKey == "" || projectID == "" {
		return nil, ErrNotConfigured
	}

	host := os.Getenv("POSTHOG_HOST")
	if host == "" {
		host = defaultHost
	}

	return &Client{
		host:      host,
		projectID: projectID,
		apiKey:    apiKey,
		http:      &http.Client{Timeout: 20 * time.Second},
	}, nil
}

// Result is the response shape of a HogQL query: Columns names the
// selected fields, Results holds one row per matching record, each
// ordered to match Columns.
type Result struct {
	Columns []string `json:"columns"`
	Results [][]any  `json:"results"`
}

// Query runs a HogQL query and returns its rows.
func (c *Client) Query(ctx context.Context, hogql string) (*Result, error) {
	payload := map[string]any{
		"query": map[string]any{
			"kind":  "HogQLQuery",
			"query": hogql,
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	endpoint := fmt.Sprintf("%s/api/projects/%s/query/", c.host, c.projectID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	res, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("posthog request failed: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("posthog responded with status %d", res.StatusCode)
	}

	var result Result
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("posthog response decode: %w", err)
	}
	return &result, nil
}
