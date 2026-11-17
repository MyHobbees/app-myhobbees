package routes

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/db"
	"github.com/myhobbees/api/internal/httpjson"
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

// adminJSON is the wire representation of an admin, deliberately missing
// PasswordHash: it is built field by field rather than from the admin
// struct so a future field added to that struct can never leak into a
// response by accident.
type adminJSON struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	IsSuperAdmin bool   `json:"isSuperAdmin"`
	CreatedAt    string `json:"createdAt"`
}

func toAdminJSON(a admin) adminJSON {
	return adminJSON{
		ID:           a.ID,
		Email:        a.Email,
		IsSuperAdmin: a.IsSuperAdmin,
		CreatedAt:    a.CreatedAt.UTC().Format(time.RFC3339),
	}
}

type createAdminBody struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	IsSuperAdmin bool   `json:"isSuperAdmin"`
}

// Admins is mounted inside app.go's super-admin-only group: every handler
// here assumes auth.Middleware and auth.RequireSuperAdmin already ran.
func Admins() chi.Router {
	r := chi.NewRouter()

	r.Post("/", createAdmin)
	r.Get("/", listAdmins)
	r.Delete("/{id}", deleteAdmin)

	return r
}

func createAdmin(w http.ResponseWriter, req *http.Request) {
	var body createAdminBody
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		httpjson.Error(w, http.StatusBadRequest, "Invalid body")
		return
	}
	body.Email = strings.TrimSpace(body.Email)
	if body.Email == "" || !emailPattern.MatchString(body.Email) {
		httpjson.Error(w, http.StatusBadRequest, "Invalid email")
		return
	}
	if body.Password == "" {
		httpjson.Error(w, http.StatusBadRequest, "Password is required")
		return
	}

	pool, err := db.Pool(req.Context())
	if err != nil {
		log.Printf("admins: db pool: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not create admin")
		return
	}

	existing, err := findAdminByEmail(req.Context(), pool, body.Email)
	if err != nil {
		log.Printf("admins: find admin: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not create admin")
		return
	}
	if existing != nil {
		httpjson.Error(w, http.StatusBadRequest, "Email already in use")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("admins: hash password: %v", err)
		httpjson.Error(w, http.StatusInternalServerError, "Could not create admin")
		return
	}

	var created admin
	created.Email = body.Email
	created.IsSuperAdmin = body.IsSuperAdmin
	err = pool.QueryRow(req.Context(), `
		INSERT INTO admins (email, password_hash, is_super_admin)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`, body.Email, string(hash), body.IsSuperAdmin).Scan(&created.ID, &created.CreatedAt)
	if err != nil {
		log.Printf("admins: insert: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not create admin")
		return
	}

	httpjson.OK(w, http.StatusCreated, toAdminJSON(created))
}

func listAdmins(w http.ResponseWriter, req *http.Request) {
	pool, err := db.Pool(req.Context())
	if err != nil {
		log.Printf("admins: db pool: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not load admins")
		return
	}

	rows, err := pool.Query(req.Context(), `
		SELECT id, email, is_super_admin, created_at
		FROM admins
		ORDER BY created_at
	`)
	if err != nil {
		log.Printf("admins: query: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not load admins")
		return
	}
	defer rows.Close()

	admins := make([]adminJSON, 0)
	for rows.Next() {
		var a admin
		if err := rows.Scan(&a.ID, &a.Email, &a.IsSuperAdmin, &a.CreatedAt); err != nil {
			log.Printf("admins: scan: %v", err)
			httpjson.Error(w, http.StatusBadGateway, "Could not load admins")
			return
		}
		admins = append(admins, toAdminJSON(a))
	}
	if err := rows.Err(); err != nil {
		log.Printf("admins: rows: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not load admins")
		return
	}

	httpjson.OK(w, http.StatusOK, admins)
}

func deleteAdmin(w http.ResponseWriter, req *http.Request) {
	idParam := chi.URLParam(req, "id")
	targetID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		httpjson.Error(w, http.StatusBadRequest, "Invalid admin id")
		return
	}

	principal, ok := auth.PrincipalFrom(req.Context())
	if !ok {
		httpjson.Error(w, http.StatusForbidden, "Forbidden")
		return
	}
	if strconv.FormatInt(targetID, 10) == principal.Subject {
		httpjson.Error(w, http.StatusBadRequest, "Cannot delete yourself")
		return
	}

	pool, err := db.Pool(req.Context())
	if err != nil {
		log.Printf("admins: db pool: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not delete admin")
		return
	}

	var target admin
	err = pool.QueryRow(req.Context(), `
		SELECT id, email, password_hash, is_super_admin, created_at
		FROM admins
		WHERE id = $1
	`, targetID).Scan(&target.ID, &target.Email, &target.PasswordHash, &target.IsSuperAdmin, &target.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		httpjson.Error(w, http.StatusNotFound, "Admin not found")
		return
	}
	if err != nil {
		log.Printf("admins: find target: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not delete admin")
		return
	}

	if target.IsSuperAdmin {
		superAdmins, err := countSuperAdmins(req.Context(), pool)
		if err != nil {
			log.Printf("admins: count super admins: %v", err)
			httpjson.Error(w, http.StatusBadGateway, "Could not delete admin")
			return
		}
		if superAdmins <= 1 {
			httpjson.Error(w, http.StatusBadRequest, "Cannot delete the last super admin")
			return
		}
	}

	if _, err := pool.Exec(req.Context(), `DELETE FROM admins WHERE id = $1`, targetID); err != nil {
		log.Printf("admins: delete: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not delete admin")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
