package routes

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/auth"
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

type lead struct {
	ID                   int64    `json:"id"`
	Email                string   `json:"email"`
	Activities           []string `json:"activities"`
	AcquisitionChannel   string   `json:"acquisitionChannel"`
	SubscriptionInterest string   `json:"subscriptionInterest"`
	UTMSource            *string  `json:"utmSource,omitempty"`
	UTMMedium            *string  `json:"utmMedium,omitempty"`
	UTMCampaign          *string  `json:"utmCampaign,omitempty"`
	Referrer             *string  `json:"referrer,omitempty"`
	CreatedAt            string   `json:"createdAt"`
}

func Leads() chi.Router {
	r := chi.NewRouter()

	r.Group(func(r chi.Router) {
		r.Use(auth.Middleware)

		r.Get("/", func(w http.ResponseWriter, req *http.Request) {
			pool, err := db.Pool(req.Context())
			if err != nil {
				log.Printf("leads: db pool: %v", err)
				httpjson.Error(w, http.StatusBadGateway, "Could not load leads")
				return
			}

			rows, err := pool.Query(req.Context(), `
				SELECT id, email, activities, acquisition_channel, subscription_interest,
					utm_source, utm_medium, utm_campaign, referrer, created_at
				FROM leads
				ORDER BY created_at DESC
			`)
			if err != nil {
				log.Printf("leads: query: %v", err)
				httpjson.Error(w, http.StatusBadGateway, "Could not load leads")
				return
			}
			defer rows.Close()

			leads := make([]lead, 0)
			for rows.Next() {
				var l lead
				var createdAt time.Time
				if err := rows.Scan(
					&l.ID, &l.Email, &l.Activities, &l.AcquisitionChannel, &l.SubscriptionInterest,
					&l.UTMSource, &l.UTMMedium, &l.UTMCampaign, &l.Referrer, &createdAt,
				); err != nil {
					log.Printf("leads: scan: %v", err)
					httpjson.Error(w, http.StatusBadGateway, "Could not load leads")
					return
				}
				l.CreatedAt = createdAt.UTC().Format(time.RFC3339)
				leads = append(leads, l)
			}
			if err := rows.Err(); err != nil {
				log.Printf("leads: rows: %v", err)
				httpjson.Error(w, http.StatusBadGateway, "Could not load leads")
				return
			}

			httpjson.OK(w, http.StatusOK, leads)
		})
	})

	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		var body leadBody
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil || !body.valid() {
			httpjson.Error(w, http.StatusBadRequest, "Invalid body")
			return
		}

		pool, err := db.Pool(req.Context())
		if err != nil {
			log.Printf("leads: db pool: %v", err)
			httpjson.Error(w, http.StatusBadGateway, "Could not save submission")
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
			log.Printf("leads: insert: %v", err)
			httpjson.Error(w, http.StatusBadGateway, "Could not save submission")
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
