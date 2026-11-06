package routes

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/db"
	"github.com/myhobbees/api/internal/httpjson"
)

var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

type leadBody struct {
	Email                string   `json:"email"`
	Activities           []string `json:"activities"`
	AcquisitionChannel   string   `json:"acquisition_channel"`
	SubscriptionInterest string   `json:"subscription_interest"`
	UTMSource            string   `json:"utm_source"`
	UTMMedium            string   `json:"utm_medium"`
	UTMCampaign          string   `json:"utm_campaign"`
	Referrer             string   `json:"referrer"`
}

func (b leadBody) valid() bool {
	if strings.TrimSpace(b.Email) == "" || !emailPattern.MatchString(b.Email) {
		return false
	}
	if len(b.Activities) == 0 {
		return false
	}
	for _, activity := range b.Activities {
		if strings.TrimSpace(activity) == "" {
			return false
		}
	}
	if strings.TrimSpace(b.AcquisitionChannel) == "" {
		return false
	}
	if strings.TrimSpace(b.SubscriptionInterest) == "" {
		return false
	}
	return true
}

func Leads() chi.Router {
	r := chi.NewRouter()

	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		var body leadBody
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil || !body.valid() {
			httpjson.Error(w, http.StatusBadRequest, "Invalid body")
			return
		}

		pool, err := db.Pool(req.Context())
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}

		_, err = pool.Exec(req.Context(), `
			INSERT INTO leads (email, activities, acquisition_channel, subscription_interest, utm_source, utm_medium, utm_campaign, referrer)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`,
			body.Email,
			body.Activities,
			body.AcquisitionChannel,
			body.SubscriptionInterest,
			nullIfEmpty(body.UTMSource),
			nullIfEmpty(body.UTMMedium),
			nullIfEmpty(body.UTMCampaign),
			nullIfEmpty(body.Referrer),
		)
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}

		httpjson.OK(w, http.StatusCreated, map[string]bool{"ok": true})
	})

	return r
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
