package routes

import (
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/httpjson"
)

func Health() chi.Router {
	r := chi.NewRouter()

	r.Get("/", func(w http.ResponseWriter, _ *http.Request) {
		httpjson.OK(w, http.StatusOK, map[string]string{
			"status":    "ok",
			"service":   "myhobbees-api",
			"env":       os.Getenv("APP_ENV"),
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	return r
}
