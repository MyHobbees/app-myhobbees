package routes

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"

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

		adminEmail := os.Getenv("ADMIN_EMAIL")
		adminHash := os.Getenv("ADMIN_PASSWORD_HASH")
		if adminEmail == "" || adminHash == "" || body.Email != adminEmail ||
			bcrypt.CompareHashAndPassword([]byte(adminHash), []byte(body.Password)) != nil {
			httpjson.Error(w, http.StatusUnauthorized, "Invalid credentials")
			return
		}

		token, err := jwt.Sign(os.Getenv("JWT_SECRET"), "admin", body.Email, 24*time.Hour)
		if err != nil {
			httpjson.Error(w, http.StatusInternalServerError, "Could not sign token")
			return
		}

		httpjson.OK(w, http.StatusOK, map[string]string{
			"token": token,
			"email": body.Email,
		})
	})

	return r
}
