package shopify

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

type Money struct {
	Amount   string `json:"amount"`
	Currency string `json:"currency"`
}

type ProductSummary struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Status          string `json:"status"`
	TotalInventory  int    `json:"totalInventory"`
	ImageURL        string `json:"imageUrl,omitempty"`
	MinPrice        Money  `json:"minPrice"`
	VariantsCount   int    `json:"variantsCount"`
	HasSubscription bool   `json:"hasSubscription"`
}

type ProductVariantDetail struct {
	ID                string `json:"id"`
	Title             string `json:"title"`
	SKU               string `json:"sku,omitempty"`
	Price             string `json:"price"`
	InventoryQuantity *int   `json:"inventoryQuantity"`
}

type ProductOption struct {
	Name   string   `json:"name"`
	Values []string `json:"values"`
}

type ProductDetail struct {
	ProductSummary
	Description  string                 `json:"description,omitempty"`
	CreatedAt    string                 `json:"createdAt"`
	Options      []ProductOption        `json:"options"`
	Variants     []ProductVariantDetail `json:"variants"`
	SellingPlans []string               `json:"sellingPlans"`
}

type CustomerSummary struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email,omitempty"`
	CreatedAt   string `json:"createdAt"`
	OrdersCount int    `json:"ordersCount"`
	AmountSpent Money  `json:"amountSpent"`
}

type CustomerAddress struct {
	Line1   string `json:"line1,omitempty"`
	Line2   string `json:"line2,omitempty"`
	Zip     string `json:"zip,omitempty"`
	City    string `json:"city,omitempty"`
	Country string `json:"country,omitempty"`
}

type CustomerOrder struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	ProcessedAt       string   `json:"processedAt"`
	FinancialStatus   string   `json:"financialStatus,omitempty"`
	FulfillmentStatus string   `json:"fulfillmentStatus"`
	Total             Money    `json:"total"`
	Tags              []string `json:"tags"`
}

type CustomerDetail struct {
	CustomerSummary
	Address *CustomerAddress `json:"address,omitempty"`
	Orders  []CustomerOrder  `json:"orders"`
}

func numericID(gid string) string {
	parts := strings.Split(gid, "/")
	return parts[len(parts)-1]
}

type gqlMoney struct {
	Amount       string `json:"amount"`
	CurrencyCode string `json:"currencyCode"`
}

func (m gqlMoney) toMoney() Money {
	return Money{Amount: m.Amount, Currency: m.CurrencyCode}
}

type gqlProductCore struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	Status         string `json:"status"`
	TotalInventory int    `json:"totalInventory"`
	FeaturedMedia  *struct {
		Preview *struct {
			Image *struct {
				URL string `json:"url"`
			} `json:"image"`
		} `json:"preview"`
	} `json:"featuredMedia"`
	PriceRangeV2 struct {
		MinVariantPrice gqlMoney `json:"minVariantPrice"`
	} `json:"priceRangeV2"`
	VariantsCount struct {
		Count int `json:"count"`
	} `json:"variantsCount"`
	SellingPlanGroupsCount struct {
		Count int `json:"count"`
	} `json:"sellingPlanGroupsCount"`
}

func (p gqlProductCore) toSummary() ProductSummary {
	summary := ProductSummary{
		ID:              numericID(p.ID),
		Title:           p.Title,
		Status:          p.Status,
		TotalInventory:  p.TotalInventory,
		MinPrice:        p.PriceRangeV2.MinVariantPrice.toMoney(),
		VariantsCount:   p.VariantsCount.Count,
		HasSubscription: p.SellingPlanGroupsCount.Count > 0,
	}
	if p.FeaturedMedia != nil && p.FeaturedMedia.Preview != nil && p.FeaturedMedia.Preview.Image != nil {
		summary.ImageURL = p.FeaturedMedia.Preview.Image.URL
	}
	return summary
}

const productCoreFields = `
	id
	title
	status
	totalInventory
	featuredMedia { preview { image { url } } }
	priceRangeV2 { minVariantPrice { amount currencyCode } }
	variantsCount { count }
	sellingPlanGroupsCount { count }`

func (c *Client) Products(ctx context.Context) ([]ProductSummary, error) {
	query := fmt.Sprintf(`{
		products(first: 50, sortKey: CREATED_AT, reverse: true) {
			nodes {%s
			}
		}
	}`, productCoreFields)

	var data struct {
		Products struct {
			Nodes []gqlProductCore `json:"nodes"`
		} `json:"products"`
	}
	if err := c.Query(ctx, query, nil, &data); err != nil {
		return nil, err
	}

	products := make([]ProductSummary, 0, len(data.Products.Nodes))
	for _, node := range data.Products.Nodes {
		products = append(products, node.toSummary())
	}
	return products, nil
}

func (c *Client) Product(ctx context.Context, id string) (*ProductDetail, error) {
	query := fmt.Sprintf(`query($id: ID!) {
		product(id: $id) {%s
			description
			createdAt
			options { name values }
			variants(first: 50) {
				nodes { id title sku price inventoryQuantity }
			}
			sellingPlanGroups(first: 5) {
				nodes { name sellingPlans(first: 5) { nodes { name } } }
			}
		}
	}`, productCoreFields)
	variables := map[string]any{"id": "gid://shopify/Product/" + id}

	var data struct {
		Product *struct {
			gqlProductCore
			Description string `json:"description"`
			CreatedAt   string `json:"createdAt"`
			Options     []struct {
				Name   string   `json:"name"`
				Values []string `json:"values"`
			} `json:"options"`
			Variants struct {
				Nodes []struct {
					ID                string `json:"id"`
					Title             string `json:"title"`
					SKU               string `json:"sku"`
					Price             string `json:"price"`
					InventoryQuantity *int   `json:"inventoryQuantity"`
				} `json:"nodes"`
			} `json:"variants"`
			SellingPlanGroups struct {
				Nodes []struct {
					Name         string `json:"name"`
					SellingPlans struct {
						Nodes []struct {
							Name string `json:"name"`
						} `json:"nodes"`
					} `json:"sellingPlans"`
				} `json:"nodes"`
			} `json:"sellingPlanGroups"`
		} `json:"product"`
	}
	if err := c.Query(ctx, query, variables, &data); err != nil {
		return nil, err
	}
	if data.Product == nil {
		return nil, nil
	}

	detail := &ProductDetail{
		ProductSummary: data.Product.toSummary(),
		Description:    data.Product.Description,
		CreatedAt:      data.Product.CreatedAt,
		Options:        []ProductOption{},
		Variants:       []ProductVariantDetail{},
		SellingPlans:   []string{},
	}
	for _, option := range data.Product.Options {
		detail.Options = append(detail.Options, ProductOption(option))
	}
	for _, variant := range data.Product.Variants.Nodes {
		detail.Variants = append(detail.Variants, ProductVariantDetail{
			ID:                numericID(variant.ID),
			Title:             variant.Title,
			SKU:               variant.SKU,
			Price:             variant.Price,
			InventoryQuantity: variant.InventoryQuantity,
		})
	}
	for _, group := range data.Product.SellingPlanGroups.Nodes {
		for _, plan := range group.SellingPlans.Nodes {
			detail.SellingPlans = append(detail.SellingPlans, fmt.Sprintf("%s — %s", group.Name, plan.Name))
		}
	}
	return detail, nil
}

type gqlCustomerCore struct {
	ID             string   `json:"id"`
	DisplayName    string   `json:"displayName"`
	Email          string   `json:"email"`
	CreatedAt      string   `json:"createdAt"`
	NumberOfOrders string   `json:"numberOfOrders"`
	AmountSpent    gqlMoney `json:"amountSpent"`
}

func (c gqlCustomerCore) toSummary() CustomerSummary {
	ordersCount, _ := strconv.Atoi(c.NumberOfOrders)
	return CustomerSummary{
		ID:          numericID(c.ID),
		Name:        c.DisplayName,
		Email:       c.Email,
		CreatedAt:   c.CreatedAt,
		OrdersCount: ordersCount,
		AmountSpent: c.AmountSpent.toMoney(),
	}
}

const customerCoreFields = `
	id
	displayName
	email
	createdAt
	numberOfOrders
	amountSpent { amount currencyCode }`

func (c *Client) Customers(ctx context.Context) ([]CustomerSummary, error) {
	query := fmt.Sprintf(`{
		customers(first: 50, sortKey: CREATED_AT, reverse: true) {
			nodes {%s
			}
		}
	}`, customerCoreFields)

	var data struct {
		Customers struct {
			Nodes []gqlCustomerCore `json:"nodes"`
		} `json:"customers"`
	}
	if err := c.Query(ctx, query, nil, &data); err != nil {
		return nil, err
	}

	customers := make([]CustomerSummary, 0, len(data.Customers.Nodes))
	for _, node := range data.Customers.Nodes {
		customers = append(customers, node.toSummary())
	}
	return customers, nil
}

func (c *Client) Customer(ctx context.Context, id string) (*CustomerDetail, error) {
	query := fmt.Sprintf(`query($id: ID!) {
		customer(id: $id) {%s
			defaultAddress { address1 address2 zip city country }
			orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
				nodes {
					id
					name
					processedAt
					displayFinancialStatus
					displayFulfillmentStatus
					totalPriceSet { shopMoney { amount currencyCode } }
					tags
				}
			}
		}
	}`, customerCoreFields)
	variables := map[string]any{"id": "gid://shopify/Customer/" + id}

	var data struct {
		Customer *struct {
			gqlCustomerCore
			DefaultAddress *struct {
				Address1 string `json:"address1"`
				Address2 string `json:"address2"`
				Zip      string `json:"zip"`
				City     string `json:"city"`
				Country  string `json:"country"`
			} `json:"defaultAddress"`
			Orders struct {
				Nodes []struct {
					ID                       string `json:"id"`
					Name                     string `json:"name"`
					ProcessedAt              string `json:"processedAt"`
					DisplayFinancialStatus   string `json:"displayFinancialStatus"`
					DisplayFulfillmentStatus string `json:"displayFulfillmentStatus"`
					TotalPriceSet            struct {
						ShopMoney gqlMoney `json:"shopMoney"`
					} `json:"totalPriceSet"`
					Tags []string `json:"tags"`
				} `json:"nodes"`
			} `json:"orders"`
		} `json:"customer"`
	}
	if err := c.Query(ctx, query, variables, &data); err != nil {
		return nil, err
	}
	if data.Customer == nil {
		return nil, nil
	}

	detail := &CustomerDetail{
		CustomerSummary: data.Customer.toSummary(),
		Orders:          []CustomerOrder{},
	}
	if addr := data.Customer.DefaultAddress; addr != nil {
		detail.Address = &CustomerAddress{
			Line1:   addr.Address1,
			Line2:   addr.Address2,
			Zip:     addr.Zip,
			City:    addr.City,
			Country: addr.Country,
		}
	}
	for _, order := range data.Customer.Orders.Nodes {
		tags := order.Tags
		if tags == nil {
			tags = []string{}
		}
		detail.Orders = append(detail.Orders, CustomerOrder{
			ID:                numericID(order.ID),
			Name:              order.Name,
			ProcessedAt:       order.ProcessedAt,
			FinancialStatus:   order.DisplayFinancialStatus,
			FulfillmentStatus: order.DisplayFulfillmentStatus,
			Total:             order.TotalPriceSet.ShopMoney.toMoney(),
			Tags:              tags,
		})
	}
	return detail, nil
}
