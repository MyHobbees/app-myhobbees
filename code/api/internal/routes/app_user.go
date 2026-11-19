package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/httpjson"
)

// App is only ever mounted inside app.go's protected /v1/app group, which
// already applies auth.AppMiddleware; it must not re-apply it here (see
// routes.Example()'s own doc comment for the double-auth-check finding this
// mirrors).
func App() chi.Router {
	r := chi.NewRouter()

	r.Get("/me", func(w http.ResponseWriter, req *http.Request) {
		principal, ok := auth.AppPrincipalFrom(req.Context())
		if !ok {
			httpjson.Error(w, http.StatusUnauthorized, "No principal")
			return
		}
		httpjson.OK(w, http.StatusOK, map[string]string{
			"userId": principal.UserID,
			"email":  principal.Email,
		})
	})

	return r
}
