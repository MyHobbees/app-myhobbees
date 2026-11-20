package routes

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/myhobbees/api/internal/db"
	"github.com/myhobbees/api/internal/httpjson"
	"github.com/myhobbees/api/internal/jwt"
)

func Auth() chi.Router {
	r := chi.NewRouter()

	r.Post("/login", func(w http.ResponseWriter, req *http.Request) {
		var body struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			httpjson.Error(w, http.StatusBadRequest, "Invalid body")
			return
		}

		pool, err := db.Pool(req.Context())
		if err != nil {
			log.Printf("auth: db pool: %v", err)
			httpjson.Error(w, http.StatusBadGateway, "Could not verify credentials")
			return
		}

		if err := bootstrapFirstSuperAdmin(req.Context(), pool); err != nil {
			log.Printf("auth: bootstrap: %v", err)
			httpjson.Error(w, http.StatusBadGateway, "Could not verify credentials")
			return
		}

		body.Email = strings.ToLower(strings.TrimSpace(body.Email))

		a, err := findAdminByEmail(req.Context(), pool, body.Email)
		if err != nil {
			log.Printf("auth: find admin: %v", err)
			httpjson.Error(w, http.StatusBadGateway, "Could not verify credentials")
			return
		}
		if a == nil || bcrypt.CompareHashAndPassword([]byte(a.PasswordHash), []byte(body.Password)) != nil {
			httpjson.Error(w, http.StatusUnauthorized, "Invalid credentials")
			return
		}

		token, err := jwt.Sign(os.Getenv("JWT_SECRET"), strconv.FormatInt(a.ID, 10), a.Email, a.IsSuperAdmin, jwt.AudienceBackoffice, 24*time.Hour)
		if err != nil {
			httpjson.Error(w, http.StatusInternalServerError, "Could not sign token")
			return
		}

		httpjson.OK(w, http.StatusOK, map[string]any{
			"token":        token,
			"email":        a.Email,
			"isSuperAdmin": a.IsSuperAdmin,
		})
	})

	return r
}
