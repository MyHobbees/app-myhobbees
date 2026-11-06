package main

import (
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"

	"github.com/myhobbees/api/internal/app"
)

func main() {
	lambda.Start(httpadapter.NewV2(app.New()).ProxyWithContext)
}
