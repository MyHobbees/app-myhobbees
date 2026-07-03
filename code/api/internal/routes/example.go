package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/db"
	"github.com/myhobbees/api/internal/httpjson"
)

func Example() chi.Router {
	r := chi.NewRouter()
	r.Use(auth.Middleware)

	r.Get("/me", func(w http.ResponseWriter, req *http.Request) {
		principal, ok := auth.PrincipalFrom(req.Context())
		if !ok {
			httpjson.Error(w, http.StatusUnauthorized, "No principal")
			return
		}
		httpjson.OK(w, http.StatusOK, map[string]string{
			"sub":   principal.Subject,
			"email": principal.Email,
		})
	})

	r.Get("/db-check", func(w http.ResponseWriter, req *http.Request) {
		pool, err := db.Pool(req.Context())
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}

		var one int
		if err := pool.QueryRow(req.Context(), "SELECT 1").Scan(&one); err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		httpjson.OK(w, http.StatusOK, map[string]int{"result": one})
	})

	return r
}
