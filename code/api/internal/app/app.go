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

	r.Mount("/health", routes.Health())

	r.Route("/v1", func(r chi.Router) {
		// --- Routes publiques : pas de auth.Middleware ici, volontairement. ---
		// Only these two routes bypass auth: Auth() exposes POST /login, and
		// CreateLead is the public lead-capture endpoint code/www-shop's "Me
		// prévenir" form posts to. Nothing else belongs in this section.
		r.Mount("/auth", routes.Auth())
		r.Post("/leads", routes.CreateLead)

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
			r.Get("/leads", routes.ListLeads)
		})
	})

	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		httpjson.Error(w, http.StatusNotFound, "Not found")
	})

	return r
}
