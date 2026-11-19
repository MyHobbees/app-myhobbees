package app

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/httpjson"
	"github.com/myhobbees/api/internal/routes"
)

func New() *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// API Gateway's ANY /{proxy+} catch-all route forwards OPTIONS preflight
	// requests to this Lambda instead of letting API Gateway answer them
	// natively, so chi must return a 2xx itself — a non-2xx preflight status
	// fails CORS in the browser even when the Access-Control-* headers
	// (added by API Gateway) are present. This has to run as middleware,
	// ahead of routing: once a path matches an existing route (e.g.
	// POST /v1/auth/login), chi's own 405 wins before any route-based
	// OPTIONS handler (even a /* wildcard) gets a chance to answer.
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			if req.Method == http.MethodOptions {
				w.Header().Set("Access-Control-Allow-Origin", "*")
				w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "*")
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, req)
		})
	})

	r.Mount("/health", routes.Health())

	r.Route("/v1", func(r chi.Router) {
		// --- Routes publiques : pas de auth.Middleware ici, volontairement. ---
		// Only these three routes bypass auth: Auth() exposes POST /login,
		// CreateLead is the public lead-capture endpoint code/www-shop's "Me
		// prévenir" form posts to, and ConsumeCredentialShare is the
		// one-time reveal link emailed/handed to a freshly created admin —
		// it must be openable without a back-office session, by design.
		// It is a POST with the token in the body, not a GET with the
		// token in the path: middleware.Logger below logs the full
		// request URL on every call, and a path segment would also land
		// in browser history and Referer headers. Nothing else belongs in
		// this section.
		r.Mount("/auth", routes.Auth())
		r.Post("/leads", routes.CreateLead)
		r.Post("/credential-shares", routes.ConsumeCredentialShare)

		// --- Tout le reste de /v1 est protégé par défaut. ---
		// A single point of truth: anything mounted inside this group
		// requires a valid Bearer token, whether or not its own router
		// remembers to apply auth.Middleware itself. Add new protected
		// routes here, not above.
		r.Group(func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Mount("/example", routes.Example())
			r.Mount("/shopify", routes.Shopify())
			r.Mount("/analytics", routes.Analytics())
			r.Mount("/infra/staging", routes.Staging())
			r.Mount("/media", routes.Media())
			r.Get("/leads", routes.ListLeads)
			r.Post("/leads/seed", routes.SeedLeads)
			r.Delete("/leads/seed", routes.CleanupSeedLeads)

			// Admin management is further restricted to super-admins
			// only, on top of (not instead of) the group's own
			// auth.Middleware — every other route above stays
			// reachable by any valid admin.
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireSuperAdmin)
				r.Mount("/admins", routes.Admins())
			})
		})
	})

	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		httpjson.Error(w, http.StatusNotFound, "Not found")
	})

	return r
}
