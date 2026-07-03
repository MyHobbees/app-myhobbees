package app

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/myhobbees/api/internal/httpjson"
	"github.com/myhobbees/api/internal/routes"
)

func New() *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Mount("/health", routes.Health())

	r.Route("/v1", func(r chi.Router) {
		r.Mount("/example", routes.Example())
	})

	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		httpjson.Error(w, http.StatusNotFound, "Not found")
	})

	return r
}
