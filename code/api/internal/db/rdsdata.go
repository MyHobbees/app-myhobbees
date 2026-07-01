// Package db wraps the AWS RDS Data API so Lambdas can query Aurora over HTTP
// without living inside a VPC or managing a connection pool.
package db

import (
	"context"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/rdsdata"
	"github.com/aws/aws-sdk-go-v2/service/rdsdata/types"

	"github.com/myhobbees/api/internal/config"
)

// Client is a thin wrapper around the RDS Data API for a single Aurora cluster.
type Client struct {
	api        *rdsdata.Client
	clusterARN string
	secretARN  string
	database   string
}

// New builds a Client from the shared configuration using the default AWS
// credential chain (the Lambda execution role in production).
func New(ctx context.Context, cfg config.Config) (*Client, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}
	return &Client{
		api:        rdsdata.NewFromConfig(awsCfg),
		clusterARN: cfg.DBClusterARN,
		secretARN:  cfg.DBSecretARN,
		database:   cfg.DBName,
	}, nil
}

// Exec runs a single SQL statement and returns the raw Data API response.
func (c *Client) Exec(ctx context.Context, sql string, params ...types.SqlParameter) (*rdsdata.ExecuteStatementOutput, error) {
	return c.api.ExecuteStatement(ctx, &rdsdata.ExecuteStatementInput{
		ResourceArn:           &c.clusterARN,
		SecretArn:             &c.secretARN,
		Database:              &c.database,
		Sql:                   &sql,
		Parameters:            params,
		IncludeResultMetadata: true,
	})
}
