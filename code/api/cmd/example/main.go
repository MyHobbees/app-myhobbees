// Command example is a protected domain Lambda mounted under /example/*.
// It is the template to copy when adding a new domain: a Lambda, an API Gateway
// route (ANY /<domain>/{proxy+}) and a build entry in deploy.api.py.
package main

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/config"
	"github.com/myhobbees/api/internal/db"
	"github.com/myhobbees/api/internal/httpjson"
	"github.com/myhobbees/api/internal/middleware"
	"github.com/myhobbees/api/internal/router"
)

func main() {
	cfg := config.Load()

	database, err := db.New(context.Background(), cfg)
	if err != nil {
		log.Fatalf("db init: %v", err)
	}

	r := router.New()
	// Routes are mounted under the full /example prefix because API Gateway
	// forwards the complete rawPath to the Lambda.
	r.Route("/example", func(r chi.Router) {
		r.Use(middleware.WithPrincipal)

		// Returns the authenticated caller derived from the JWT authorizer.
		r.Get("/me", func(w http.ResponseWriter, req *http.Request) {
			p, ok := middleware.PrincipalFrom(req.Context())
			if !ok {
				httpjson.Error(w, http.StatusUnauthorized, "no principal")
				return
			}
			httpjson.OK(w, http.StatusOK, map[string]string{
				"sub":   p.Subject,
				"email": p.Email,
			})
		})

		// Verifies connectivity to Aurora through the RDS Data API.
		r.Get("/db-check", func(w http.ResponseWriter, req *http.Request) {
			out, err := database.Exec(req.Context(), "SELECT 1")
			if err != nil {
				httpjson.Error(w, http.StatusBadGateway, err.Error())
				return
			}
			httpjson.OK(w, http.StatusOK, map[string]any{
				"rows": len(out.Records),
			})
		})
	})

	router.Start(r)
}
