// Package config centralises environment-driven configuration shared by every Lambda.
package config

import "os"

// Config holds the runtime configuration read from the Lambda environment.
type Config struct {
	AppEnv       string // stg | prd
	JWTSecret    string // HS256 signing secret for the custom JWTs
	DBClusterARN string // Aurora cluster ARN (RDS Data API resourceArn)
	DBSecretARN  string // Secrets Manager ARN holding the DB credentials
	DBName       string // Postgres database name
}

// Load reads the configuration from the process environment.
func Load() Config {
	return Config{
		AppEnv:       os.Getenv("APP_ENV"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		DBClusterARN: os.Getenv("DB_CLUSTER_ARN"),
		DBSecretARN:  os.Getenv("DB_SECRET_ARN"),
		DBName:       os.Getenv("DB_NAME"),
	}
}
