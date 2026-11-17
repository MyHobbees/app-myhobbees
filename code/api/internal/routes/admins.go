package routes

import (
	"context"
	"errors"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type admin struct {
	ID           int64
	Email        string
	PasswordHash string
	IsSuperAdmin bool
	CreatedAt    time.Time
}

// findAdminByEmail looks up an admin by email. A not-found row is not an
// error: it reports (nil, nil) so callers (login, admin creation) can treat
// "no such admin" as a normal outcome rather than a failure to query.
func findAdminByEmail(ctx context.Context, pool *pgxpool.Pool, email string) (*admin, error) {
	var a admin
	err := pool.QueryRow(ctx, `
		SELECT id, email, password_hash, is_super_admin, created_at
		FROM admins
		WHERE email = $1
	`, email).Scan(&a.ID, &a.Email, &a.PasswordHash, &a.IsSuperAdmin, &a.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// countSuperAdmins reports how many admins currently hold the super-admin
// role, used to refuse deleting the last one.
func countSuperAdmins(ctx context.Context, pool *pgxpool.Pool) (int, error) {
	var count int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM admins WHERE is_super_admin`).Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

// bootstrapFirstSuperAdmin seeds the very first super-admin from the
// ADMIN_EMAIL/ADMIN_PASSWORD_HASH env vars, but only while the admins table
// is still empty. Once any admin exists (bootstrapped or created via the
// API), it is a permanent no-op: those env vars never gate a login again,
// they only ever amorce an empty table. See aidd_docs/tasks/.../plan.md
// Decisions for why this isn't a SQL seed instead.
func bootstrapFirstSuperAdmin(ctx context.Context, pool *pgxpool.Pool) error {
	var count int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM admins`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	email := os.Getenv("ADMIN_EMAIL")
	hash := os.Getenv("ADMIN_PASSWORD_HASH")
	if email == "" || hash == "" {
		return nil
	}

	_, err := pool.Exec(ctx, `
		INSERT INTO admins (email, password_hash, is_super_admin)
		VALUES ($1, $2, true)
	`, email, hash)
	return err
}
