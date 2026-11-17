// Package awsrds controls a single, fixed RDS instance (the stg database)
// from the prd Lambda's own IAM role, scoped by Terraform to that one
// instance ARN — see infrastructure/terraform/api/iam_staging_control.tf.
package awsrds

import (
	"context"
	"errors"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/rds"
	"github.com/aws/aws-sdk-go-v2/service/rds/types"
)

var ErrNotConfigured = errors.New("staging db control not configured")

type Client struct {
	rds          *rds.Client
	dbInstanceID string
}

// FromEnv returns ErrNotConfigured when STAGING_DB_IDENTIFIER is unset,
// which is the case everywhere except the prd Lambda (see lambda.tf).
func FromEnv(ctx context.Context) (*Client, error) {
	id := os.Getenv("STAGING_DB_IDENTIFIER")
	if id == "" {
		return nil, ErrNotConfigured
	}
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}
	return &Client{rds: rds.NewFromConfig(cfg), dbInstanceID: id}, nil
}

func (c *Client) Status(ctx context.Context) (string, error) {
	out, err := c.rds.DescribeDBInstances(ctx, &rds.DescribeDBInstancesInput{
		DBInstanceIdentifier: aws.String(c.dbInstanceID),
	})
	if err != nil {
		return "", err
	}
	if len(out.DBInstances) == 0 {
		return "", errors.New("staging database not found")
	}
	return aws.ToString(out.DBInstances[0].DBInstanceStatus), nil
}

func (c *Client) Start(ctx context.Context) error {
	_, err := c.rds.StartDBInstance(ctx, &rds.StartDBInstanceInput{
		DBInstanceIdentifier: aws.String(c.dbInstanceID),
	})
	var alreadyStarting *types.InvalidDBInstanceStateFault
	if errors.As(err, &alreadyStarting) {
		return nil
	}
	return err
}

func (c *Client) Stop(ctx context.Context) error {
	_, err := c.rds.StopDBInstance(ctx, &rds.StopDBInstanceInput{
		DBInstanceIdentifier: aws.String(c.dbInstanceID),
	})
	var alreadyStopping *types.InvalidDBInstanceStateFault
	if errors.As(err, &alreadyStopping) {
		return nil
	}
	return err
}
