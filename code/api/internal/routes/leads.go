package routes

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

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
	// SubscriptionOfferSlug is a read-side normalization of
	// SubscriptionInterest, not a stored column: code/www-shop's
	// me-prevenir.tsx posts the offer's *display label* (item.title), not
	// its stable slug (item.slug), so the raw value drifts with every copy
	// change and can't be joined against /v1/analytics's offer_click slugs.
	// This maps the 3 known labels from www-shop's subscriptionOffers.ts
	// back to their slug for display/filtering; anything else (including
	// pre-existing free-text rows) falls into "other".
	//
	// This is a workaround, not the fix: me-prevenir.tsx should post
	// item.slug directly, but touching code/www-shop is out of scope for
	// this chantier. See aidd_docs/tasks/.../review.md finding 4.
	SubscriptionOfferSlug string  `json:"subscriptionOfferSlug"`
	UTMSource             *string `json:"utmSource,omitempty"`
	UTMMedium             *string `json:"utmMedium,omitempty"`
	UTMCampaign           *string `json:"utmCampaign,omitempty"`
	Referrer              *string `json:"referrer,omitempty"`
	CreatedAt             string  `json:"createdAt"`
}

// subscriptionOfferLabels maps the exact offer titles code/www-shop's
// me-prevenir.tsx posts as subscription_interest (see
// code/www-shop/app/lib/subscriptionOffers.ts) to their stable slug, the
// same dimension code/api/internal/routes/analytics.go groups offer_click
// events on.
var subscriptionOfferLabels = map[string]string{
	"Box créative surprise":       "box-creative",
	"Box + accès à l’application": "box-app",
	"Parcours d’apprentissage":    "app-only",
}

const otherSubscriptionOfferSlug = "other"

// normalizeSubscriptionOfferSlug maps a raw subscription_interest value
// (either an already-correct slug, a known display label, or free text) to
// one of the 3 real offer slugs, or "other" when it matches neither.
func normalizeSubscriptionOfferSlug(raw string) string {
	switch raw {
	case "box-creative", "box-app", "app-only":
		return raw
	}
	if slug, ok := subscriptionOfferLabels[raw]; ok {
		return slug
	}
	return otherSubscriptionOfferSlug
}

// ListLeads is mounted directly (not via a sub-router) inside app.go's
// protected /v1 group: GET /v1/leads must never be reachable without the
// group's auth.Middleware running first. See CreateLead for the public
// counterpart, mounted outside that group.
func ListLeads(w http.ResponseWriter, req *http.Request) {
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
		l.SubscriptionOfferSlug = normalizeSubscriptionOfferSlug(l.SubscriptionInterest)
		leads = append(leads, l)
	}
	if err := rows.Err(); err != nil {
		log.Printf("leads: rows: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not load leads")
		return
	}

	httpjson.OK(w, http.StatusOK, leads)
}

// CreateLead is mounted directly (not via a sub-router) inside app.go's
// public section: POST /v1/leads is the public lead-capture endpoint used by
// code/www-shop's "Me prévenir" form and must stay reachable without a
// Bearer token.
func CreateLead(w http.ResponseWriter, req *http.Request) {
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
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

const (
	// seedEmailDomain is RFC 2606's reserved test TLD: no real signup can
	// ever land here, so matching on it for cleanup can never delete a real
	// lead.
	seedEmailDomain  = "example.test"
	seedEmailPattern = "seed-%@" + seedEmailDomain
	seedDefaultCount = 10
	seedMinCount     = 1
	seedMaxCount     = 100
)

// seedActivities/seedAcquisitionChannels/seedSubscriptionInterests mirror
// the plausible values code/www-shop's me-prevenir.tsx offers real
// visitors (ACTIVITIES/ACQUISITION_CHANNELS) and the 3 real subscription
// offer titles (see subscriptionOfferLabels above) — inspiration only, not
// imported, since this is Go generating test fixtures, not the TS form.
var (
	seedActivities            = []string{"Crochet", "Couture", "Peinture", "Autre"}
	seedAcquisitionChannels   = []string{"Instagram", "TikTok", "Recherche Google", "Bouche-à-oreille", "Autre"}
	seedSubscriptionInterests = []string{"Box créative surprise", "Box + accès à l’application", "Parcours d’apprentissage"}
)

// requireStg is the single-point-of-truth guard for both seed endpoints:
// "stg uniquement" means exactly that, not "everything but prd" — loc is
// blocked too, by design (a developer testing locally seeds their own DB
// directly; this button exists for stg, the one shared environment nobody
// can just psql into).
func requireStg(w http.ResponseWriter) bool {
	if os.Getenv("APP_ENV") != "stg" {
		httpjson.Error(w, http.StatusForbidden, "Only available on stg")
		return false
	}
	return true
}

// SeedLeads is mounted inside app.go's protected /v1 group (any
// authenticated admin, not super-admin-only: the guard that matters here is
// the environment, not the role). Seeded rows are recognizable by email
// alone (seed-<n>@example.test), with no extra column, so CleanupSeedLeads
// can target exactly them.
func SeedLeads(w http.ResponseWriter, req *http.Request) {
	if !requireStg(w) {
		return
	}

	count := seedDefaultCount
	if raw := req.URL.Query().Get("count"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil {
			httpjson.Error(w, http.StatusBadRequest, "count must be a number")
			return
		}
		count = n
	}
	if count < seedMinCount || count > seedMaxCount {
		httpjson.Error(w, http.StatusBadRequest, fmt.Sprintf("count must be between %d and %d", seedMinCount, seedMaxCount))
		return
	}

	pool, err := db.Pool(req.Context())
	if err != nil {
		log.Printf("leads: db pool: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not seed leads")
		return
	}

	// base+i, not a shared counter: leads.email carries no unique
	// constraint (see code/database/migrations), but a distinct number per
	// row still lets several successive seeds coexist without ever
	// reusing an email.
	base := time.Now().UnixNano()
	for i := 0; i < count; i++ {
		email := fmt.Sprintf("seed-%d@%s", base+int64(i), seedEmailDomain)
		activities := []string{seedActivities[rand.Intn(len(seedActivities))]}
		channel := seedAcquisitionChannels[rand.Intn(len(seedAcquisitionChannels))]
		interest := seedSubscriptionInterests[rand.Intn(len(seedSubscriptionInterests))]

		_, err := pool.Exec(req.Context(), `
			INSERT INTO leads (email, activities, acquisition_channel, subscription_interest)
			VALUES ($1, $2, $3, $4)
		`, email, activities, channel, interest)
		if err != nil {
			log.Printf("leads: seed insert: %v", err)
			httpjson.Error(w, http.StatusBadGateway, "Could not seed leads")
			return
		}
	}

	httpjson.OK(w, http.StatusOK, map[string]int{"created": count})
}

// CleanupSeedLeads deletes every row matching the seed email pattern and
// nothing else: a real signup can never match seedEmailPattern (see
// seedEmailDomain's doc comment), so this can't touch a genuine lead.
func CleanupSeedLeads(w http.ResponseWriter, req *http.Request) {
	if !requireStg(w) {
		return
	}

	pool, err := db.Pool(req.Context())
	if err != nil {
		log.Printf("leads: db pool: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not cleanup seeded leads")
		return
	}

	tag, err := pool.Exec(req.Context(), `DELETE FROM leads WHERE email LIKE $1`, seedEmailPattern)
	if err != nil {
		log.Printf("leads: seed cleanup: %v", err)
		httpjson.Error(w, http.StatusBadGateway, "Could not cleanup seeded leads")
		return
	}

	httpjson.OK(w, http.StatusOK, map[string]int64{"deleted": tag.RowsAffected()})
}
