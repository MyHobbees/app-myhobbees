package main

import (
	"log"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"

	"github.com/myhobbees/api/internal/app"
	"github.com/myhobbees/api/internal/auth"
)

func main() {
	if err := auth.ValidateSecret(os.Getenv("JWT_SECRET")); err != nil {
		log.Fatalf("refusing to start: %v", err)
	}

	lambda.Start(httpadapter.NewV2(app.New()).ProxyWithContext)
}
