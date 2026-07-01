// Command health is the public health-check Lambda (GET /health).
package main

import (
	"net/http"

	"github.com/myhobbees/api/internal/config"
	"github.com/myhobbees/api/internal/httpjson"
	"github.com/myhobbees/api/internal/router"
)

func main() {
	cfg := config.Load()
	r := router.New()

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		httpjson.OK(w, http.StatusOK, map[string]string{
			"status": "ok",
			"env":    cfg.AppEnv,
		})
	})

	router.Start(r)
}
