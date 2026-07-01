// Command authorizer is the shared API Gateway HTTP API (v2) Lambda authorizer.
// It validates the custom JWT and exposes the caller's claims to downstream
// Lambdas via the authorizer context.
package main

import (
	"context"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	"github.com/myhobbees/api/internal/config"
	"github.com/myhobbees/api/internal/jwt"
)

func handler(cfg config.Config) func(context.Context, events.APIGatewayV2CustomAuthorizerV2Request) (events.APIGatewayV2CustomAuthorizerSimpleResponse, error) {
	return func(_ context.Context, req events.APIGatewayV2CustomAuthorizerV2Request) (events.APIGatewayV2CustomAuthorizerSimpleResponse, error) {
		deny := events.APIGatewayV2CustomAuthorizerSimpleResponse{IsAuthorized: false}

		// Header keys are lower-cased in the v2 payload.
		auth := req.Headers["authorization"]
		if auth == "" {
			auth = req.Headers["Authorization"]
		}
		token, ok := strings.CutPrefix(auth, "Bearer ")
		if !ok {
			return deny, nil
		}

		claims, err := jwt.Verify(cfg.JWTSecret, token)
		if err != nil {
			return deny, nil
		}

		return events.APIGatewayV2CustomAuthorizerSimpleResponse{
			IsAuthorized: true,
			Context: map[string]interface{}{
				"sub":   claims.Subject,
				"email": claims.Email,
			},
		}, nil
	}
}

func main() {
	lambda.Start(handler(config.Load()))
}
