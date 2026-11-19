package routes

import (
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/awsrds"
	"github.com/myhobbees/api/internal/githubactions"
	"github.com/myhobbees/api/internal/httpjson"
)

// These target a single, fixed repo and a single, dedicated
// workflow_dispatch-only workflow — never configurable otherwise, see
// .github/workflows/migrate-stg-on-demand.yml.
const (
	stagingMigrateOwner        = "MyHobbees"
	stagingMigrateRepo         = "app-myhobbees"
	stagingMigrateWorkflowFile = "migrate-stg-on-demand.yml"
	stagingMigrateRef          = "dev"
)

// Staging is only ever mounted inside app.go's protected /v1 group, which
// already applies auth.Middleware; it must not re-apply it here (see
// aidd_docs/tasks/.../review.md finding: double auth check per request).
func Staging() chi.Router {
	r := chi.NewRouter()

	r.Get("/status", func(w http.ResponseWriter, req *http.Request) {
		client, err := awsrds.FromEnv(req.Context())
		if err != nil {
			if errors.Is(err, awsrds.ErrNotConfigured) {
				httpjson.OK(w, http.StatusOK, map[string]any{
					"connected": false,
				})
				return
			}
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}

		status, err := client.Status(req.Context())
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}

		httpjson.OK(w, http.StatusOK, map[string]any{
			"connected": true,
			"status":    status,
		})
	})

	r.Post("/start", func(w http.ResponseWriter, req *http.Request) {
		client, err := awsrds.FromEnv(req.Context())
		if err != nil {
			if errors.Is(err, awsrds.ErrNotConfigured) {
				httpjson.Error(w, http.StatusConflict, "Base de données staging non configurée")
				return
			}
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}

		if err := client.Start(req.Context()); err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}

		httpjson.OK(w, http.StatusAccepted, map[string]any{"status": "starting"})
	})

	r.Post("/migrate", func(w http.ResponseWriter, req *http.Request) {
		token := os.Getenv("GITHUB_ACTIONS_TOKEN")
		if token == "" {
			httpjson.Error(w, http.StatusConflict, "Déclenchement des migrations non configuré")
			return
		}

		httpClient := &http.Client{Timeout: 10 * time.Second}
		err := githubactions.TriggerWorkflow(req.Context(), httpClient, token, stagingMigrateOwner, stagingMigrateRepo, stagingMigrateWorkflowFile, stagingMigrateRef)
		if err != nil {
			log.Printf("staging migrate: dispatch failed: %v", err)
			httpjson.Error(w, http.StatusBadGateway, "Impossible de déclencher les migrations")
			return
		}

		httpjson.OK(w, http.StatusAccepted, map[string]any{"status": "triggered"})
	})

	return r
}
