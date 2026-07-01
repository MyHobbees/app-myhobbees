// Package router provides a shared chi router and the Lambda entrypoint wiring
// (API Gateway HTTP API v2 -> chi via aws-lambda-go-api-proxy).
package router

import (
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

// New returns a chi router preconfigured with the common middleware stack.
func New() *chi.Mux {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	return r
}

// Start adapts the chi router to the API Gateway HTTP API v2 payload and hands
// control to the Lambda runtime. It never returns.
func Start(r *chi.Mux) {
	lambda.Start(httpadapter.NewV2(r).ProxyWithContext)
}
