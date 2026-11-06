package shopify

import (
	"context"
	"strconv"
)

func atoiSafe(s string) int {
	n, _ := strconv.Atoi(s)
	return n
}

type OrderSummary struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	ProcessedAt       string   `json:"processedAt"`
	CancelledAt       string   `json:"cancelledAt,omitempty"`
	Tags              []string `json:"tags"`
	FinancialStatus   string   `json:"financialStatus,omitempty"`
	FulfillmentStatus string   `json:"fulfillmentStatus"`
	Customer          *struct {
		Name  string `json:"name"`
		Email string `json:"email,omitempty"`
	} `json:"customer,omitempty"`
	ItemsCount int   `json:"itemsCount"`
	Total      Money `json:"total"`
}

type OrderLineItem struct {
	Title        string `json:"title"`
	VariantTitle string `json:"variantTitle,omitempty"`
	Quantity     int    `json:"quantity"`
	UnitPrice    Money  `json:"unitPrice"`
}

type OrderFulfillment struct {
	CreatedAt       string `json:"createdAt"`
	TrackingNumber  string `json:"trackingNumber,omitempty"`
	TrackingCompany string `json:"trackingCompany,omitempty"`
}

type OrderDetail struct {
	OrderSummary
	Note            string             `json:"note,omitempty"`
	ContractID      string             `json:"contractId,omitempty"`
	PaymentGateways []string           `json:"paymentGateways"`
	CustomerID      string             `json:"customerId,omitempty"`
	CustomerOrders  int                `json:"customerOrders,omitempty"`
	Address         *CustomerAddress   `json:"address,omitempty"`
	Subtotal        Money              `json:"subtotal"`
	ShippingTotal   Money              `json:"shippingTotal"`
	LineItems       []OrderLineItem    `json:"lineItems"`
	Fulfillments    []OrderFulfillment `json:"fulfillments"`
}

type gqlOrderCore struct {
	ID                       string   `json:"id"`
	Name                     string   `json:"name"`
	ProcessedAt              string   `json:"processedAt"`
	CancelledAt              string   `json:"cancelledAt"`
	Tags                     []string `json:"tags"`
	DisplayFinancialStatus   string   `json:"displayFinancialStatus"`
	DisplayFulfillmentStatus string   `json:"displayFulfillmentStatus"`
	SubtotalLineItemsQty     int      `json:"subtotalLineItemsQuantity"`
	Customer                 *struct {
		ID             string `json:"id"`
		DisplayName    string `json:"displayName"`
		Email          string `json:"email"`
		NumberOfOrders string `json:"numberOfOrders"`
	} `json:"customer"`
	TotalPriceSet struct {
		ShopMoney gqlMoney `json:"shopMoney"`
	} `json:"totalPriceSet"`
}

func (o gqlOrderCore) toSummary() OrderSummary {
	tags := o.Tags
	if tags == nil {
		tags = []string{}
	}
	summary := OrderSummary{
		ID:                numericID(o.ID),
		Name:              o.Name,
		ProcessedAt:       o.ProcessedAt,
		CancelledAt:       o.CancelledAt,
		Tags:              tags,
		FinancialStatus:   o.DisplayFinancialStatus,
		FulfillmentStatus: o.DisplayFulfillmentStatus,
		ItemsCount:        o.SubtotalLineItemsQty,
		Total:             o.TotalPriceSet.ShopMoney.toMoney(),
	}
	if o.Customer != nil {
		summary.Customer = &struct {
			Name  string `json:"name"`
			Email string `json:"email,omitempty"`
		}{Name: o.Customer.DisplayName, Email: o.Customer.Email}
	}
	return summary
}

const orderCoreFields = `
	id
	name
	processedAt
	cancelledAt
	tags
	displayFinancialStatus
	displayFulfillmentStatus
	subtotalLineItemsQuantity
	customer { id displayName email numberOfOrders }
	totalPriceSet { shopMoney { amount currencyCode } }`

func (c *Client) Orders(ctx context.Context) ([]OrderSummary, error) {
	query := `{
		orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
			nodes {` + orderCoreFields + `
			}
		}
	}`

	var data struct {
		Orders struct {
			Nodes []gqlOrderCore `json:"nodes"`
		} `json:"orders"`
	}
	if err := c.Query(ctx, query, nil, &data); err != nil {
		return nil, err
	}

	orders := make([]OrderSummary, 0, len(data.Orders.Nodes))
	for _, node := range data.Orders.Nodes {
		orders = append(orders, node.toSummary())
	}
	return orders, nil
}

func (c *Client) Order(ctx context.Context, id string) (*OrderDetail, error) {
	query := `query($id: ID!) {
		order(id: $id) {` + orderCoreFields + `
			note
			customAttributes { key value }
			paymentGatewayNames
			shippingAddress { address1 address2 zip city country }
			subtotalPriceSet { shopMoney { amount currencyCode } }
			totalShippingPriceSet { shopMoney { amount currencyCode } }
			lineItems(first: 50) {
				nodes {
					title
					variantTitle
					quantity
					originalUnitPriceSet { shopMoney { amount currencyCode } }
				}
			}
			fulfillments(first: 5) {
				createdAt
				trackingInfo(first: 1) { number company }
			}
		}
	}`
	variables := map[string]any{"id": "gid://shopify/Order/" + id}

	var data struct {
		Order *struct {
			gqlOrderCore
			Note             string `json:"note"`
			CustomAttributes []struct {
				Key   string `json:"key"`
				Value string `json:"value"`
			} `json:"customAttributes"`
			PaymentGatewayNames []string `json:"paymentGatewayNames"`
			ShippingAddress     *struct {
				Address1 string `json:"address1"`
				Address2 string `json:"address2"`
				Zip      string `json:"zip"`
				City     string `json:"city"`
				Country  string `json:"country"`
			} `json:"shippingAddress"`
			SubtotalPriceSet struct {
				ShopMoney gqlMoney `json:"shopMoney"`
			} `json:"subtotalPriceSet"`
			TotalShippingPriceSet struct {
				ShopMoney gqlMoney `json:"shopMoney"`
			} `json:"totalShippingPriceSet"`
			LineItems struct {
				Nodes []struct {
					Title                string `json:"title"`
					VariantTitle         string `json:"variantTitle"`
					Quantity             int    `json:"quantity"`
					OriginalUnitPriceSet struct {
						ShopMoney gqlMoney `json:"shopMoney"`
					} `json:"originalUnitPriceSet"`
				} `json:"nodes"`
			} `json:"lineItems"`
			Fulfillments []struct {
				CreatedAt    string `json:"createdAt"`
				TrackingInfo []struct {
					Number  string `json:"number"`
					Company string `json:"company"`
				} `json:"trackingInfo"`
			} `json:"fulfillments"`
		} `json:"order"`
	}
	if err := c.Query(ctx, query, variables, &data); err != nil {
		return nil, err
	}
	if data.Order == nil {
		return nil, nil
	}

	detail := &OrderDetail{
		OrderSummary:    data.Order.toSummary(),
		Note:            data.Order.Note,
		PaymentGateways: data.Order.PaymentGatewayNames,
		Subtotal:        data.Order.SubtotalPriceSet.ShopMoney.toMoney(),
		ShippingTotal:   data.Order.TotalShippingPriceSet.ShopMoney.toMoney(),
		LineItems:       []OrderLineItem{},
		Fulfillments:    []OrderFulfillment{},
	}
	if detail.PaymentGateways == nil {
		detail.PaymentGateways = []string{}
	}
	if data.Order.Customer != nil {
		detail.CustomerID = numericID(data.Order.Customer.ID)
		detail.CustomerOrders = atoiSafe(data.Order.Customer.NumberOfOrders)
	}
	for _, attr := range data.Order.CustomAttributes {
		if attr.Key == "contract_id" {
			detail.ContractID = attr.Value
		}
	}
	if addr := data.Order.ShippingAddress; addr != nil {
		detail.Address = &CustomerAddress{
			Line1:   addr.Address1,
			Line2:   addr.Address2,
			Zip:     addr.Zip,
			City:    addr.City,
			Country: addr.Country,
		}
	}
	for _, item := range data.Order.LineItems.Nodes {
		detail.LineItems = append(detail.LineItems, OrderLineItem{
			Title:        item.Title,
			VariantTitle: item.VariantTitle,
			Quantity:     item.Quantity,
			UnitPrice:    item.OriginalUnitPriceSet.ShopMoney.toMoney(),
		})
	}
	for _, fulfillment := range data.Order.Fulfillments {
		entry := OrderFulfillment{CreatedAt: fulfillment.CreatedAt}
		if len(fulfillment.TrackingInfo) > 0 {
			entry.TrackingNumber = fulfillment.TrackingInfo[0].Number
			entry.TrackingCompany = fulfillment.TrackingInfo[0].Company
		}
		detail.Fulfillments = append(detail.Fulfillments, entry)
	}
	return detail, nil
}
