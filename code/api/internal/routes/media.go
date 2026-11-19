package routes

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/httpjson"
	"github.com/myhobbees/api/internal/media"
)

const videoURLTTL = 15 * time.Minute

// Media is only ever mounted inside app.go's protected /v1 group, which
// already applies auth.Middleware; it must not re-apply it here (see
// aidd_docs/tasks/.../review.md finding: double auth check per request).
func Media() chi.Router {
	r := chi.NewRouter()

	r.Post("/presign-upload", func(w http.ResponseWriter, req *http.Request) {
		var body struct {
			Bucket string `json:"bucket"`
			Key    string `json:"key"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			httpjson.Error(w, http.StatusBadRequest, "Corps JSON invalide")
			return
		}
		if body.Bucket != "video" && body.Bucket != "image" {
			httpjson.Error(w, http.StatusBadRequest, "bucket doit être \"video\" ou \"image\"")
			return
		}
		if body.Key == "" {
			httpjson.Error(w, http.StatusBadRequest, "key manquante")
			return
		}

		client, ok := mediaClient(w, req)
		if !ok {
			return
		}

		url, expiresAt, err := client.PresignUpload(req.Context(), body.Bucket, body.Key)
		if err != nil {
			if errors.Is(err, media.ErrNotConfigured) {
				httpjson.Error(w, http.StatusBadGateway, "Stockage média non configuré")
				return
			}
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}

		httpjson.OK(w, http.StatusOK, map[string]any{
			"url":       url,
			"expiresAt": expiresAt,
		})
	})

	r.Get("/video-url", func(w http.ResponseWriter, req *http.Request) {
		key := req.URL.Query().Get("key")
		if key == "" {
			httpjson.Error(w, http.StatusBadRequest, "key manquante")
			return
		}

		client, ok := mediaClient(w, req)
		if !ok {
			return
		}

		url, expiresAt, err := client.SignVideoURL(key, videoURLTTL)
		if err != nil {
			if errors.Is(err, media.ErrNotConfigured) {
				httpjson.Error(w, http.StatusBadGateway, "Signature vidéo non configurée")
				return
			}
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}

		httpjson.OK(w, http.StatusOK, map[string]any{
			"url":       url,
			"expiresAt": expiresAt,
		})
	})

	return r
}

func mediaClient(w http.ResponseWriter, req *http.Request) (*media.Client, bool) {
	client, err := media.FromEnv(req.Context())
	if err != nil {
		if errors.Is(err, media.ErrNotConfigured) {
			httpjson.Error(w, http.StatusBadGateway, "Stockage média non configuré")
			return nil, false
		}
		httpjson.Error(w, http.StatusBadGateway, err.Error())
		return nil, false
	}
	return client, true
}
