package db

import (
	"context"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	pool     *pgxpool.Pool
	initOnce sync.Once
	initErr  error
)

func Pool(ctx context.Context) (*pgxpool.Pool, error) {
	initOnce.Do(func() {
		sslMode := os.Getenv("DB_SSLMODE")
		if sslMode == "" {
			sslMode = "require"
		}

		dsn := fmt.Sprintf(
			"host=%s port=%s dbname=%s user=%s password=%s sslmode=%s",
			os.Getenv("DB_HOST"),
			os.Getenv("DB_PORT"),
			os.Getenv("DB_NAME"),
			os.Getenv("DB_USERNAME"),
			os.Getenv("DB_PASSWORD"),
			sslMode,
		)

		cfg, err := pgxpool.ParseConfig(dsn)
		if err != nil {
			initErr = err
			return
		}
		cfg.MaxConns = 5
		cfg.MaxConnIdleTime = 30 * time.Second

		pool, initErr = pgxpool.NewWithConfig(ctx, cfg)
	})
	return pool, initErr
}
