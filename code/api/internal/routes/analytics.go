package routes

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/db"
	"github.com/myhobbees/api/internal/httpjson"
	"github.com/myhobbees/api/internal/posthog"
)

const (
	// overviewCacheTTL bounds how often a successful overview re-queries
	// PostHog. With 3 periods (7/30/90) and 3 HogQL queries per miss, a
	// 15-minute TTL caps usage at 3 * 4 misses/hour * 3 queries = 36
	// requests/hour, well under PostHog's 120/hour limit even if an admin
	// cycles through all three periods continuously.
	overviewCacheTTL = 15 * time.Minute

	// overviewErrorCacheTTL is the short-lived cache for a failed PostHog
	// call (outage, invalid key, timeout, ...). Without it, every refresh
	// of a broken dashboard would re-hit PostHog immediately.
	overviewErrorCacheTTL = time.Minute
)

var trackedEvents = []string{"cta_click", "offer_click", "waitlist_signup", "app_click"}

type dayCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type eventCount struct {
	Event string `json:"event"`
	Count int    `json:"count"`
}

type offerCount struct {
	Offer string `json:"offer"`
	Count int    `json:"count"`
}

type posthogOverview struct {
	Days               int          `json:"days"`
	Visitors           int          `json:"visitors"`
	CtaClicks          int          `json:"ctaClicks"`
	OfferClicks        int          `json:"offerClicks"`
	WaitlistSignups    int          `json:"waitlistSignups"`
	AppClicks          int          `json:"appClicks"`
	VisitorToEmailRate float64      `json:"visitorToEmailRate"`
	CtaToEmailRate     float64      `json:"ctaToEmailRate"`
	PageviewsByDay     []dayCount   `json:"pageviewsByDay"`
	EventCounts        []eventCount `json:"eventCounts"`
	OfferClicksByOffer []offerCount `json:"offerClicksByOffer"`
}

type overviewCacheEntry struct {
	data      posthogOverview
	err       error
	expiresAt time.Time
}

var (
	overviewCacheMu sync.Mutex
	overviewCache   = map[int]overviewCacheEntry{}
)

func Analytics() chi.Router {
	r := chi.NewRouter()
	r.Use(auth.Middleware)

	r.Get("/posthog/overview", func(w http.ResponseWriter, req *http.Request) {
		days := 30
		switch req.URL.Query().Get("days") {
		case "7":
			days = 7
		case "90":
			days = 90
		}

		if cachedData, cachedErr, ok := overviewFromCache(days); ok {
			if cachedErr != nil {
				httpjson.Error(w, http.StatusBadGateway, cachedErr.Error())
				return
			}
			httpjson.OK(w, http.StatusOK, cachedData)
			return
		}

		client, err := posthog.FromEnv()
		if err != nil {
			if errors.Is(err, posthog.ErrNotConfigured) {
				// Not cached: a missing config is cheap to report and may
				// be fixed between two requests (e.g. during local setup).
				httpjson.Error(w, http.StatusBadGateway, "PostHog not configured")
				return
			}
			overviewToCache(days, posthogOverview{}, err, overviewErrorCacheTTL)
			httpjson.Error(w, http.StatusBadGateway, "Could not reach PostHog")
			return
		}

		overview, err := fetchOverview(req.Context(), client, days)
		if err != nil {
			log.Printf("analytics: posthog overview: %v", err)
			overviewToCache(days, posthogOverview{}, err, overviewErrorCacheTTL)
			httpjson.Error(w, http.StatusBadGateway, "Could not load analytics")
			return
		}

		overviewToCache(days, *overview, nil, overviewCacheTTL)
		httpjson.OK(w, http.StatusOK, overview)
	})

	return r
}

func overviewFromCache(days int) (posthogOverview, error, bool) {
	overviewCacheMu.Lock()
	defer overviewCacheMu.Unlock()

	entry, ok := overviewCache[days]
	if !ok || time.Now().After(entry.expiresAt) {
		return posthogOverview{}, nil, false
	}
	return entry.data, entry.err, true
}

func overviewToCache(days int, data posthogOverview, err error, ttl time.Duration) {
	overviewCacheMu.Lock()
	defer overviewCacheMu.Unlock()

	overviewCache[days] = overviewCacheEntry{
		data:      data,
		err:       err,
		expiresAt: time.Now().Add(ttl),
	}
}

func fetchOverview(ctx context.Context, client *posthog.Client, days int) (*posthogOverview, error) {
	interval := fmt.Sprintf("%d DAY", days)

	pageviewsByDay, err := queryPageviewsByDay(ctx, client, interval)
	if err != nil {
		return nil, fmt.Errorf("pageviews by day: %w", err)
	}

	visitors, eventCounts, countsByEvent, err := querySummaryCounts(ctx, client, interval)
	if err != nil {
		return nil, fmt.Errorf("summary counts: %w", err)
	}

	offerClicksByOffer, err := queryOfferClicksByOffer(ctx, client, interval)
	if err != nil {
		return nil, fmt.Errorf("offer clicks by offer: %w", err)
	}

	// The waitlist signup count from PostHog ($0 until traffic resumes after
	// the cta_click/offer_click/waitlist_signup/app_click rename) is kept
	// for the raw event counter, but the decisive "visitor -> email" rate
	// is sourced from the leads table instead: it is the immediate, reliable
	// source of truth for the launch, while PostHog catches up over time.
	leadsSignups, err := countLeadsSince(ctx, days)
	if err != nil {
		return nil, fmt.Errorf("leads count: %w", err)
	}

	ctaClicks := countsByEvent["cta_click"]
	offerClicks := countsByEvent["offer_click"]
	waitlistSignups := countsByEvent["waitlist_signup"]
	appClicks := countsByEvent["app_click"]

	var visitorToEmailRate, ctaToEmailRate float64
	if visitors > 0 {
		visitorToEmailRate = float64(leadsSignups) / float64(visitors)
	}
	if ctaClicks > 0 {
		ctaToEmailRate = float64(waitlistSignups) / float64(ctaClicks)
	}

	return &posthogOverview{
		Days:               days,
		Visitors:           visitors,
		CtaClicks:          ctaClicks,
		OfferClicks:        offerClicks,
		WaitlistSignups:    waitlistSignups,
		AppClicks:          appClicks,
		VisitorToEmailRate: visitorToEmailRate,
		CtaToEmailRate:     ctaToEmailRate,
		PageviewsByDay:     pageviewsByDay,
		EventCounts:        eventCounts,
		OfferClicksByOffer: offerClicksByOffer,
	}, nil
}

// countLeadsSince returns how many rows the leads table gained in the last
// `days` days. It is the source of truth for the "visitor -> email" KPI:
// unlike the PostHog waitlist_signup event, it reflects every real form
// submission immediately.
func countLeadsSince(ctx context.Context, days int) (int, error) {
	pool, err := db.Pool(ctx)
	if err != nil {
		return 0, err
	}

	var count int
	err = pool.QueryRow(ctx, `
		SELECT count(*) FROM leads
		WHERE created_at >= now() - ($1 || ' days')::interval
	`, days).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func queryPageviewsByDay(ctx context.Context, client *posthog.Client, interval string) ([]dayCount, error) {
	query := fmt.Sprintf(`
		SELECT toDate(timestamp) AS day, count() AS total
		FROM events
		WHERE event = '$pageview' AND timestamp >= now() - INTERVAL %s
		GROUP BY day
		ORDER BY day
	`, interval)

	result, err := client.Query(ctx, query)
	if err != nil {
		return nil, err
	}

	points := make([]dayCount, 0, len(result.Results))
	for _, row := range result.Results {
		if len(row) < 2 {
			continue
		}
		points = append(points, dayCount{
			Date:  fmt.Sprint(row[0]),
			Count: toInt(row[1]),
		})
	}
	return points, nil
}

// querySummaryCounts fetches distinct visitors and the per-tracked-event
// counts in a single HogQL query (instead of two), to keep PostHog usage
// under quota: see overviewCacheTTL.
func querySummaryCounts(ctx context.Context, client *posthog.Client, interval string) (int, []eventCount, map[string]int, error) {
	query := fmt.Sprintf(`
		SELECT
			count(DISTINCT if(event = '$pageview', distinct_id, NULL)) AS visitors,
			countIf(event = 'cta_click') AS cta_click,
			countIf(event = 'offer_click') AS offer_click,
			countIf(event = 'waitlist_signup') AS waitlist_signup,
			countIf(event = 'app_click') AS app_click
		FROM events
		WHERE timestamp >= now() - INTERVAL %s
	`, interval)

	result, err := client.Query(ctx, query)
	if err != nil {
		return 0, nil, nil, err
	}
	if len(result.Results) == 0 || len(result.Results[0]) < 5 {
		return 0, nil, map[string]int{}, nil
	}

	row := result.Results[0]
	visitors := toInt(row[0])
	byEvent := map[string]int{
		"cta_click":       toInt(row[1]),
		"offer_click":     toInt(row[2]),
		"waitlist_signup": toInt(row[3]),
		"app_click":       toInt(row[4]),
	}

	counts := make([]eventCount, 0, len(trackedEvents))
	for _, event := range trackedEvents {
		counts = append(counts, eventCount{Event: event, Count: byEvent[event]})
	}
	return visitors, counts, byEvent, nil
}

func queryOfferClicksByOffer(ctx context.Context, client *posthog.Client, interval string) ([]offerCount, error) {
	query := fmt.Sprintf(`
		SELECT properties.offer AS offer, count() AS total
		FROM events
		WHERE event = 'offer_click' AND timestamp >= now() - INTERVAL %s
		GROUP BY offer
		ORDER BY total DESC
	`, interval)

	result, err := client.Query(ctx, query)
	if err != nil {
		return nil, err
	}

	offers := make([]offerCount, 0, len(result.Results))
	for _, row := range result.Results {
		if len(row) < 2 {
			continue
		}
		offers = append(offers, offerCount{
			Offer: fmt.Sprint(row[0]),
			Count: toInt(row[1]),
		})
	}
	return offers, nil
}

func toInt(v any) int {
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	case int64:
		return int(n)
	default:
		return 0
	}
}
