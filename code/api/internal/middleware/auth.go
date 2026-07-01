// Package middleware exposes chi middleware that reads the identity injected by
// the API Gateway JWT Lambda authorizer.
package middleware

import (
	"context"
	"net/http"

	"github.com/awslabs/aws-lambda-go-api-proxy/core"
)

type ctxKey string

// principalKey stores the authenticated principal on the request context.
const principalKey ctxKey = "principal"

// Principal is the authenticated caller derived from the authorizer context.
type Principal struct {
	Subject string
	Email   string
}

// WithPrincipal reads the authorizer context (populated by the JWT authorizer
// Lambda) off the original API Gateway v2 event and stores it on the request.
func WithPrincipal(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if evt, ok := core.GetAPIGatewayV2ContextFromContext(r.Context()); ok {
			if lambdaCtx := evt.Authorizer.Lambda; lambdaCtx != nil {
				p := Principal{}
				if sub, ok := lambdaCtx["sub"].(string); ok {
					p.Subject = sub
				}
				if email, ok := lambdaCtx["email"].(string); ok {
					p.Email = email
				}
				r = r.WithContext(context.WithValue(r.Context(), principalKey, p))
			}
		}
		next.ServeHTTP(w, r)
	})
}

// PrincipalFrom returns the authenticated principal stored on the context.
func PrincipalFrom(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(principalKey).(Principal)
	return p, ok
}
