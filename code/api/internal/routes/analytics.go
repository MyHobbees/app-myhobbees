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
	"github.com/myhobbees/api/internal/httpjson"
	"github.com/myhobbees/api/internal/posthog"
)

const overviewCacheTTL = 5 * time.Minute

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

		if cached, ok := overviewFromCache(days); ok {
			httpjson.OK(w, http.StatusOK, cached)
			return
		}

		client, err := posthog.FromEnv()
		if err != nil {
			if errors.Is(err, posthog.ErrNotConfigured) {
				httpjson.Error(w, http.StatusBadGateway, "PostHog not configured")
				return
			}
			httpjson.Error(w, http.StatusBadGateway, "Could not reach PostHog")
			return
		}

		overview, err := fetchOverview(req.Context(), client, days)
		if err != nil {
			log.Printf("analytics: posthog overview: %v", err)
			httpjson.Error(w, http.StatusBadGateway, "Could not load analytics")
			return
		}

		overviewToCache(days, *overview)
		httpjson.OK(w, http.StatusOK, overview)
	})

	return r
}

func overviewFromCache(days int) (posthogOverview, bool) {
	overviewCacheMu.Lock()
	defer overviewCacheMu.Unlock()

	entry, ok := overviewCache[days]
	if !ok || time.Now().After(entry.expiresAt) {
		return posthogOverview{}, false
	}
	return entry.data, true
}

func overviewToCache(days int, data posthogOverview) {
	overviewCacheMu.Lock()
	defer overviewCacheMu.Unlock()

	overviewCache[days] = overviewCacheEntry{
		data:      data,
		expiresAt: time.Now().Add(overviewCacheTTL),
	}
}

func fetchOverview(ctx context.Context, client *posthog.Client, days int) (*posthogOverview, error) {
	interval := fmt.Sprintf("%d DAY", days)

	pageviewsByDay, err := queryPageviewsByDay(ctx, client, interval)
	if err != nil {
		return nil, fmt.Errorf("pageviews by day: %w", err)
	}

	visitors, err := queryDistinctVisitors(ctx, client, interval)
	if err != nil {
		return nil, fmt.Errorf("distinct visitors: %w", err)
	}

	eventCounts, countsByEvent, err := queryEventCounts(ctx, client, interval)
	if err != nil {
		return nil, fmt.Errorf("event counts: %w", err)
	}

	offerClicksByOffer, err := queryOfferClicksByOffer(ctx, client, interval)
	if err != nil {
		return nil, fmt.Errorf("offer clicks by offer: %w", err)
	}

	ctaClicks := countsByEvent["cta_click"]
	offerClicks := countsByEvent["offer_click"]
	waitlistSignups := countsByEvent["waitlist_signup"]
	appClicks := countsByEvent["app_click"]

	var visitorToEmailRate, ctaToEmailRate float64
	if visitors > 0 {
		visitorToEmailRate = float64(waitlistSignups) / float64(visitors)
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

func queryDistinctVisitors(ctx context.Context, client *posthog.Client, interval string) (int, error) {
	query := fmt.Sprintf(`
		SELECT count(DISTINCT distinct_id) AS visitors
		FROM events
		WHERE event = '$pageview' AND timestamp >= now() - INTERVAL %s
	`, interval)

	result, err := client.Query(ctx, query)
	if err != nil {
		return 0, err
	}
	if len(result.Results) == 0 || len(result.Results[0]) == 0 {
		return 0, nil
	}
	return toInt(result.Results[0][0]), nil
}

func queryEventCounts(ctx context.Context, client *posthog.Client, interval string) ([]eventCount, map[string]int, error) {
	query := fmt.Sprintf(`
		SELECT event, count() AS total
		FROM events
		WHERE event IN ('cta_click', 'offer_click', 'waitlist_signup', 'app_click')
			AND timestamp >= now() - INTERVAL %s
		GROUP BY event
	`, interval)

	result, err := client.Query(ctx, query)
	if err != nil {
		return nil, nil, err
	}

	byEvent := make(map[string]int, len(trackedEvents))
	for _, row := range result.Results {
		if len(row) < 2 {
			continue
		}
		byEvent[fmt.Sprint(row[0])] = toInt(row[1])
	}

	counts := make([]eventCount, 0, len(trackedEvents))
	for _, event := range trackedEvents {
		counts = append(counts, eventCount{Event: event, Count: byEvent[event]})
	}
	return counts, byEvent, nil
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
