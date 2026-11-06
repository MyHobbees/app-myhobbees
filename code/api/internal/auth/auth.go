package auth

import (
	"context"
	"net/http"
	"os"
	"strings"

	"github.com/myhobbees/api/internal/httpjson"
	"github.com/myhobbees/api/internal/jwt"
)

type ctxKey string

const principalKey ctxKey = "principal"

type Principal struct {
	Subject string
	Email   string
}

func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok {
			httpjson.Error(w, http.StatusUnauthorized, "Missing bearer token")
			return
		}

		claims, err := jwt.Verify(os.Getenv("JWT_SECRET"), token)
		if err != nil {
			httpjson.Error(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		principal := Principal{Subject: claims.Subject, Email: claims.Email}
		next.ServeHTTP(w, r.WithContext(
			context.WithValue(r.Context(), principalKey, principal),
		))
	})
}

func PrincipalFrom(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(principalKey).(Principal)
	return p, ok
}
