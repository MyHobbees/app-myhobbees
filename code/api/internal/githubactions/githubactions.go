// Package githubactions triggers an existing GitHub Actions workflow via
// its workflow_dispatch event. It never carries DB credentials: the
// workflow it dispatches holds those as its own CI secrets.
package githubactions

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
)

// ErrDispatchFailed is returned when GitHub rejects or fails to accept a
// workflow_dispatch request. It never carries GitHub's raw response body,
// which could include internal details - that goes to the server log only.
var ErrDispatchFailed = errors.New("github actions dispatch failed")

// APIBaseURL is overridden in tests to point at an httptest.Server instead
// of the real GitHub API.
var APIBaseURL = "https://api.github.com"

// TriggerWorkflow fires a workflow_dispatch event for workflowFile on ref,
// using the given token (Actions: write scope on owner/repo).
//
// Per GitHub's REST API spec, a successful dispatch responds 204 No
// Content by default, or 200 with a JSON body only when the caller sets
// return_run_details (which this call never does). Any 2xx is treated as
// success for robustness against that documented variance.
func TriggerWorkflow(ctx context.Context, httpClient *http.Client, token, owner, repo, workflowFile, ref string) error {
	endpoint := fmt.Sprintf("%s/repos/%s/%s/actions/workflows/%s/dispatches", APIBaseURL, owner, repo, workflowFile)

	body, err := json.Marshal(map[string]string{"ref": ref})
	if err != nil {
		return fmt.Errorf("%w: %v", ErrDispatchFailed, err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("%w: %v", ErrDispatchFailed, err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	res, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrDispatchFailed, err)
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		respBody, _ := io.ReadAll(res.Body)
		log.Printf("githubactions: dispatch of %s/%s %s failed with status %d: %s", owner, repo, workflowFile, res.StatusCode, respBody)
		return fmt.Errorf("%w: status %d", ErrDispatchFailed, res.StatusCode)
	}

	return nil
}
