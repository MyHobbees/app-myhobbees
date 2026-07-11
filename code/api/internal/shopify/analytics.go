package shopify

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"time"
)

type DayPoint struct {
	Date         string  `json:"date"`
	Subscription float64 `json:"subscription"`
	OneOff       float64 `json:"oneOff"`
}

type TopProduct struct {
	Title    string  `json:"title"`
	Quantity int     `json:"quantity"`
	Revenue  float64 `json:"revenue"`
}

type Analytics struct {
	Currency            string       `json:"currency"`
	Revenue             float64      `json:"revenue"`
	Orders              int          `json:"orders"`
	AverageOrder        float64      `json:"averageOrder"`
	SubscriptionRevenue float64      `json:"subscriptionRevenue"`
	OneOffRevenue       float64      `json:"oneOffRevenue"`
	ActiveSubscriptions int          `json:"activeSubscriptions"`
	RevenueByDay        []DayPoint   `json:"revenueByDay"`
	TopProducts         []TopProduct `json:"topProducts"`
}

func (c *Client) Analytics(ctx context.Context, days int) (*Analytics, error) {
	since := time.Now().AddDate(0, 0, -days)
	query := fmt.Sprintf(`{
		orders(first: 250, query: "processed_at:>=%s") {
			nodes {
				processedAt
				cancelledAt
				tags
				totalPriceSet { shopMoney { amount currencyCode } }
				customAttributes { key value }
				lineItems(first: 10) {
					nodes {
						title
						quantity
						discountedTotalSet { shopMoney { amount } }
					}
				}
			}
		}
	}`, since.Format("2006-01-02"))

	var data struct {
		Orders struct {
			Nodes []struct {
				ProcessedAt   string   `json:"processedAt"`
				CancelledAt   string   `json:"cancelledAt"`
				Tags          []string `json:"tags"`
				TotalPriceSet struct {
					ShopMoney gqlMoney `json:"shopMoney"`
				} `json:"totalPriceSet"`
				CustomAttributes []struct {
					Key   string `json:"key"`
					Value string `json:"value"`
				} `json:"customAttributes"`
				LineItems struct {
					Nodes []struct {
						Title              string `json:"title"`
						Quantity           int    `json:"quantity"`
						DiscountedTotalSet struct {
							ShopMoney gqlMoney `json:"shopMoney"`
						} `json:"discountedTotalSet"`
					} `json:"nodes"`
				} `json:"lineItems"`
			} `json:"nodes"`
		} `json:"orders"`
	}
	if err := c.Query(ctx, query, nil, &data); err != nil {
		return nil, err
	}

	analytics := &Analytics{
		RevenueByDay: make([]DayPoint, 0, days),
		TopProducts:  []TopProduct{},
	}

	byDay := map[string]*DayPoint{}
	for i := 0; i <= days; i++ {
		date := since.AddDate(0, 0, i).Format("2006-01-02")
		point := &DayPoint{Date: date}
		byDay[date] = point
		analytics.RevenueByDay = append(analytics.RevenueByDay, DayPoint{Date: date})
	}

	type productAgg struct {
		quantity int
		revenue  float64
	}
	products := map[string]*productAgg{}
	recentContracts := map[string]bool{}
	activeSince := time.Now().AddDate(0, 0, -35)

	for _, order := range data.Orders.Nodes {
		if order.CancelledAt != "" {
			continue
		}
		total, _ := strconv.ParseFloat(order.TotalPriceSet.ShopMoney.Amount, 64)
		if analytics.Currency == "" {
			analytics.Currency = order.TotalPriceSet.ShopMoney.CurrencyCode
		}

		isSubscription := false
		for _, tag := range order.Tags {
			if tag == "subscription" {
				isSubscription = true
			}
		}

		analytics.Revenue += total
		analytics.Orders++
		if isSubscription {
			analytics.SubscriptionRevenue += total
		} else {
			analytics.OneOffRevenue += total
		}

		processedAt, err := time.Parse(time.RFC3339, order.ProcessedAt)
		if err == nil {
			if point, ok := byDay[processedAt.Format("2006-01-02")]; ok {
				if isSubscription {
					point.Subscription += total
				} else {
					point.OneOff += total
				}
			}
			if isSubscription && processedAt.After(activeSince) {
				for _, attr := range order.CustomAttributes {
					if attr.Key == "contract_id" {
						recentContracts[attr.Value] = true
					}
				}
			}
		}

		for _, item := range order.LineItems.Nodes {
			agg, ok := products[item.Title]
			if !ok {
				agg = &productAgg{}
				products[item.Title] = agg
			}
			agg.quantity += item.Quantity
			itemRevenue, _ := strconv.ParseFloat(item.DiscountedTotalSet.ShopMoney.Amount, 64)
			agg.revenue += itemRevenue
		}
	}

	if analytics.Orders > 0 {
		analytics.AverageOrder = analytics.Revenue / float64(analytics.Orders)
	}
	analytics.ActiveSubscriptions = len(recentContracts)

	for i := range analytics.RevenueByDay {
		if point, ok := byDay[analytics.RevenueByDay[i].Date]; ok {
			analytics.RevenueByDay[i].Subscription = point.Subscription
			analytics.RevenueByDay[i].OneOff = point.OneOff
		}
	}

	for title, agg := range products {
		analytics.TopProducts = append(analytics.TopProducts, TopProduct{
			Title:    title,
			Quantity: agg.quantity,
			Revenue:  agg.revenue,
		})
	}
	sort.Slice(analytics.TopProducts, func(i, j int) bool {
		return analytics.TopProducts[i].Revenue > analytics.TopProducts[j].Revenue
	})
	if len(analytics.TopProducts) > 5 {
		analytics.TopProducts = analytics.TopProducts[:5]
	}

	return analytics, nil
}
