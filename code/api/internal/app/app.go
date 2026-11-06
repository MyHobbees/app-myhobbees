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
		// Protected is the default for everything under /v1. Only the two
		// explicit exceptions below (login, public lead capture) are
		// mounted outside this group: any future r.Mount placed inside it
		// is protected even if its own router forgets auth.Middleware.
		r.Group(func(r chi.Router) {
			r.Use(auth.Middleware)
			r.Mount("/example", routes.Example())
			r.Mount("/shopify", routes.Shopify())
			r.Mount("/analytics", routes.Analytics())
		})

		// Explicit public exceptions. Auth() only exposes POST /login.
		// Leads() mixes a public POST / with a GET / it protects itself
		// internally, so it is mounted here rather than in the group above.
		r.Mount("/auth", routes.Auth())
		r.Mount("/leads", routes.Leads())
	})

	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		httpjson.Error(w, http.StatusNotFound, "Not found")
	})

	return r
}
