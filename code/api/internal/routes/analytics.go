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

// EmailSignups is the same leads-table count used as the numerator of
// VisitorToEmailRate. It is a distinct field from WaitlistSignups (the raw
// PostHog event counter) on purpose: the back-office KPI row must never show
// an "Inscriptions" card sourced differently than the rate derived from it.
type posthogOverview struct {
	Days               int          `json:"days"`
	Visitors           int          `json:"visitors"`
	CtaClicks          int          `json:"ctaClicks"`
	OfferClicks        int          `json:"offerClicks"`
	WaitlistSignups    int          `json:"waitlistSignups"`
	EmailSignups       int          `json:"emailSignups"`
	AppClicks          int          `json:"appClicks"`
	VisitorToEmailRate float64      `json:"visitorToEmailRate"`
	CtaToEmailRate     float64      `json:"ctaToEmailRate"`
	PageviewsByDay     []dayCount   `json:"pageviewsByDay"`
	EventCounts        []eventCount `json:"eventCounts"`
	OfferClicksByOffer []offerCount `json:"offerClicksByOffer"`
}

// overviewCacheEntry caches the exact public-facing message on failure, not
// the internal Go error: both the "fresh" and "cached" response paths must
// return the same generic body, never pgx/DB/PostHog internals to the client.
type overviewCacheEntry struct {
	data      posthogOverview
	message   string
	expiresAt time.Time
}

var (
	overviewCacheMu sync.Mutex
	overviewCache   = map[int]overviewCacheEntry{}
)

// Analytics is only ever mounted inside app.go's protected /v1 group, which
// already applies auth.Middleware; it must not re-apply it here (see
// aidd_docs/tasks/.../review.md finding: double auth check per request).
func Analytics() chi.Router {
	r := chi.NewRouter()

	r.Get("/posthog/overview", func(w http.ResponseWriter, req *http.Request) {
		days := 30
		switch req.URL.Query().Get("days") {
		case "7":
			days = 7
		case "90":
			days = 90
		}

		if cachedData, cachedMessage, ok := overviewFromCache(days); ok {
			if cachedMessage != "" {
				httpjson.Error(w, http.StatusBadGateway, cachedMessage)
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
			log.Printf("analytics: posthog client: %v", err)
			overviewToCache(days, posthogOverview{}, "Could not reach PostHog", overviewErrorCacheTTL)
			httpjson.Error(w, http.StatusBadGateway, "Could not reach PostHog")
			return
		}

		overview, err := fetchOverview(req.Context(), client, days)
		if err != nil {
			log.Printf("analytics: posthog overview: %v", err)
			overviewToCache(days, posthogOverview{}, "Could not load analytics", overviewErrorCacheTTL)
			httpjson.Error(w, http.StatusBadGateway, "Could not load analytics")
			return
		}

		overviewToCache(days, *overview, "", overviewCacheTTL)
		httpjson.OK(w, http.StatusOK, overview)
	})

	return r
}

// overviewFromCache reports a cached entry's data and, on a cached failure,
// the public message to send verbatim (never an internal error string).
func overviewFromCache(days int) (data posthogOverview, cachedMessage string, ok bool) {
	overviewCacheMu.Lock()
	defer overviewCacheMu.Unlock()

	entry, found := overviewCache[days]
	if !found || time.Now().After(entry.expiresAt) {
		return posthogOverview{}, "", false
	}
	return entry.data, entry.message, true
}

func overviewToCache(days int, data posthogOverview, message string, ttl time.Duration) {
	overviewCacheMu.Lock()
	defer overviewCacheMu.Unlock()

	overviewCache[days] = overviewCacheEntry{
		data:      data,
		message:   message,
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
		EmailSignups:       leadsSignups,
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
//
// days is cast explicitly: left as a bare parameter, Postgres infers $1 as
// text (to match the removed `|| ' days'` concatenation) and pgx cannot
// encode a Go int into that shape, failing on every call. make_interval
// takes a typed integer, so the cast is unambiguous.
func countLeadsSince(ctx context.Context, days int) (int, error) {
	pool, err := db.Pool(ctx)
	if err != nil {
		return 0, err
	}

	var count int
	err = pool.QueryRow(ctx, `
		SELECT count(*) FROM leads
		WHERE created_at >= now() - make_interval(days => $1::int)
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
