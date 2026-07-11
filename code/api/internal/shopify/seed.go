package shopify

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"time"
)

type SeedBase struct {
	Products  int         `json:"products"`
	Customers int         `json:"customers"`
	Orders    []OrderSpec `json:"orders"`
}

type OrderSpec struct {
	CustomerID  string   `json:"customerId"`
	VariantID   string   `json:"variantId"`
	Quantity    int      `json:"quantity"`
	ProcessedAt string   `json:"processedAt"`
	Tags        []string `json:"tags,omitempty"`
	ContractID  string   `json:"contractId,omitempty"`
}

type SeedOrdersResult struct {
	Created   int  `json:"created"`
	Renewals  int  `json:"renewals"`
	Throttled bool `json:"throttled"`
}

type CleanupResult struct {
	Orders            int  `json:"orders"`
	Customers         int  `json:"customers"`
	Products          int  `json:"products"`
	SellingPlanGroups int  `json:"sellingPlanGroups"`
	Remaining         bool `json:"remaining"`
	Throttled         bool `json:"throttled"`
}

var boxThemes = []struct {
	theme string
	price string
}{
	{"Crochet", "34.90"},
	{"Tricot", "36.90"},
	{"Broderie", "32.90"},
	{"Macramé", "34.90"},
	{"Peinture par numéros", "39.90"},
	{"Bijoux en perles", "36.90"},
	{"Origami", "29.90"},
	{"Scrapbooking", "34.90"},
	{"Modelage argile", "39.90"},
	{"Bougies", "36.90"},
	{"Savonnerie", "34.90"},
	{"Aquarelle", "32.90"},
}

func (c *Client) SeedBase(ctx context.Context) (*SeedBase, error) {
	suffix := fmt.Sprintf("%d", time.Now().Unix())
	base := &SeedBase{}

	subscriptionDescription := "Une box surprise chaque mois pendant 12 mois, pour découvrir une nouvelle passion créative : crochet, tricot, broderie, macramé, peinture par numéros et bien d'autres."
	subscriptionProductID, subscriptionVariantID, err := c.createProduct(ctx, "Box Passion — Abonnement mensuel", suffix, "29.90", subscriptionDescription)
	if err != nil {
		return base, err
	}
	base.Products++

	if err := c.createSellingPlanGroup(ctx, suffix, []string{subscriptionProductID}); err != nil {
		return base, err
	}

	boxVariantIDs := make([]string, 0, len(boxThemes))
	for _, box := range boxThemes {
		description := fmt.Sprintf("La box %s à l'unité : tout le matériel et le pas-à-pas pour découvrir cette passion.", strings.ToLower(box.theme))
		_, variantID, err := c.createProduct(ctx, "Box "+box.theme, suffix, box.price, description)
		if err != nil {
			return base, err
		}
		boxVariantIDs = append(boxVariantIDs, variantID)
		base.Products++
	}

	customers := [][2]string{
		{"Camille", "Martin"},
		{"Lucas", "Bernard"},
		{"Emma", "Dubois"},
		{"Hugo", "Thomas"},
		{"Léa", "Robert"},
		{"Nathan", "Richard"},
		{"Chloé", "Petit"},
		{"Louis", "Durand"},
	}
	customerIDs := make([]string, 0, len(customers))
	for _, c2 := range customers {
		customerID, err := c.createCustomer(ctx, c2[0], c2[1], suffix)
		if err != nil {
			return base, err
		}
		customerIDs = append(customerIDs, customerID)
		base.Customers++
	}

	orders := make([]OrderSpec, 0, 30)
	for i := 0; i < 6; i++ {
		customerID := customerIDs[i]
		contractID := fmt.Sprintf("SUB-%s-%d", suffix, i+1)
		start := time.Now().AddDate(0, 0, -(60 + rand.Intn(31)))
		for cycle := 0; cycle < 3; cycle++ {
			tags := []string{"subscription"}
			if cycle > 0 {
				tags = []string{"subscription", "subscription-renewal"}
			}
			orders = append(orders, OrderSpec{
				CustomerID:  customerID,
				VariantID:   subscriptionVariantID,
				Quantity:    1,
				ProcessedAt: start.AddDate(0, 0, cycle*30).Format(time.RFC3339),
				Tags:        tags,
				ContractID:  contractID,
			})
		}
	}
	for i := 0; i < 12; i++ {
		orders = append(orders, OrderSpec{
			CustomerID:  customerIDs[rand.Intn(len(customerIDs))],
			VariantID:   boxVariantIDs[rand.Intn(len(boxVariantIDs))],
			Quantity:    1 + rand.Intn(2),
			ProcessedAt: time.Now().AddDate(0, 0, -rand.Intn(91)).Format(time.RFC3339),
		})
	}
	base.Orders = orders

	return base, nil
}

func (c *Client) SeedOrders(ctx context.Context, orders []OrderSpec) (*SeedOrdersResult, error) {
	result := &SeedOrdersResult{}
	for _, order := range orders {
		if err := c.createOrder(ctx, order); err != nil {
			if isThrottled(err) {
				result.Throttled = true
				return result, nil
			}
			return result, err
		}
		result.Created++
		for _, tag := range order.Tags {
			if tag == "subscription-renewal" {
				result.Renewals++
			}
		}
	}
	return result, nil
}

const cleanupBatch = 15

func (c *Client) Cleanup(ctx context.Context) (*CleanupResult, error) {
	result := &CleanupResult{}

	orderIDs, err := c.listIDs(ctx, "orders")
	if err != nil {
		return result, err
	}
	for _, id := range orderIDs {
		if err := c.deleteOrder(ctx, id); err != nil {
			if isThrottled(err) {
				result.Throttled = true
				result.Remaining = true
				return result, nil
			}
			return result, err
		}
		result.Orders++
	}
	if len(orderIDs) == cleanupBatch {
		result.Remaining = true
		return result, nil
	}

	customerIDs, err := c.listIDs(ctx, "customers")
	if err != nil {
		return result, err
	}
	for _, id := range customerIDs {
		if err := c.deleteCustomer(ctx, id); err != nil {
			if isThrottled(err) {
				result.Throttled = true
				result.Remaining = true
				return result, nil
			}
			return result, err
		}
		result.Customers++
	}
	if len(customerIDs) == cleanupBatch {
		result.Remaining = true
		return result, nil
	}

	productIDs, err := c.listIDs(ctx, "products")
	if err != nil {
		return result, err
	}
	for _, id := range productIDs {
		if err := c.deleteProduct(ctx, id); err != nil {
			if isThrottled(err) {
				result.Throttled = true
				result.Remaining = true
				return result, nil
			}
			return result, err
		}
		result.Products++
	}
	if len(productIDs) == cleanupBatch {
		result.Remaining = true
		return result, nil
	}

	groupIDs, err := c.listIDs(ctx, "sellingPlanGroups")
	if err != nil {
		return result, err
	}
	for _, id := range groupIDs {
		if err := c.deleteSellingPlanGroup(ctx, id); err != nil {
			if isThrottled(err) {
				result.Throttled = true
				result.Remaining = true
				return result, nil
			}
			return result, err
		}
		result.SellingPlanGroups++
	}
	if len(groupIDs) == cleanupBatch {
		result.Remaining = true
	}

	return result, nil
}

func (c *Client) listIDs(ctx context.Context, connection string) ([]string, error) {
	query := fmt.Sprintf(`{ %s(first: %d) { nodes { id } } }`, connection, cleanupBatch)

	var data map[string]struct {
		Nodes []struct {
			ID string `json:"id"`
		} `json:"nodes"`
	}
	if err := c.Query(ctx, query, nil, &data); err != nil {
		return nil, err
	}

	ids := make([]string, 0, len(data[connection].Nodes))
	for _, node := range data[connection].Nodes {
		ids = append(ids, node.ID)
	}
	return ids, nil
}

func (c *Client) deleteOrder(ctx context.Context, id string) error {
	query := `mutation($orderId: ID!) {
		orderDelete(orderId: $orderId) {
			deletedId
			userErrors { field message }
		}
	}`
	var data struct {
		OrderDelete struct {
			UserErrors []userError `json:"userErrors"`
		} `json:"orderDelete"`
	}
	if err := c.Query(ctx, query, map[string]any{"orderId": id}, &data); err != nil {
		return err
	}
	return checkUserErrors("orderDelete", data.OrderDelete.UserErrors)
}

func (c *Client) deleteCustomer(ctx context.Context, id string) error {
	query := `mutation($input: CustomerDeleteInput!) {
		customerDelete(input: $input) {
			deletedCustomerId
			userErrors { field message }
		}
	}`
	var data struct {
		CustomerDelete struct {
			UserErrors []userError `json:"userErrors"`
		} `json:"customerDelete"`
	}
	if err := c.Query(ctx, query, map[string]any{"input": map[string]any{"id": id}}, &data); err != nil {
		return err
	}
	return checkUserErrors("customerDelete", data.CustomerDelete.UserErrors)
}

func (c *Client) deleteProduct(ctx context.Context, id string) error {
	query := `mutation($input: ProductDeleteInput!) {
		productDelete(input: $input) {
			deletedProductId
			userErrors { field message }
		}
	}`
	var data struct {
		ProductDelete struct {
			UserErrors []userError `json:"userErrors"`
		} `json:"productDelete"`
	}
	if err := c.Query(ctx, query, map[string]any{"input": map[string]any{"id": id}}, &data); err != nil {
		return err
	}
	return checkUserErrors("productDelete", data.ProductDelete.UserErrors)
}

func (c *Client) deleteSellingPlanGroup(ctx context.Context, id string) error {
	query := `mutation($id: ID!) {
		sellingPlanGroupDelete(id: $id) {
			deletedSellingPlanGroupId
			userErrors { field message }
		}
	}`
	var data struct {
		SellingPlanGroupDelete struct {
			UserErrors []userError `json:"userErrors"`
		} `json:"sellingPlanGroupDelete"`
	}
	if err := c.Query(ctx, query, map[string]any{"id": id}, &data); err != nil {
		return err
	}
	return checkUserErrors("sellingPlanGroupDelete", data.SellingPlanGroupDelete.UserErrors)
}

func isThrottled(err error) bool {
	msg := err.Error()
	return strings.Contains(msg, "Too many attempts") ||
		strings.Contains(msg, "status 429") ||
		strings.Contains(msg, "Client.Timeout") ||
		strings.Contains(msg, "context deadline exceeded")
}

func (c *Client) createProduct(ctx context.Context, title, suffix, price, description string) (string, string, error) {
	query := `mutation($input: ProductSetInput!) {
		productSet(input: $input) {
			product { id variants(first: 1) { nodes { id } } }
			userErrors { field message }
		}
	}`
	input := map[string]any{
		"title":  title,
		"handle": fmt.Sprintf("%s-%s", slugify(title), suffix),
		"status": "ACTIVE",
		"productOptions": []map[string]any{
			{"name": "Title", "position": 1, "values": []map[string]any{{"name": "Default Title"}}},
		},
		"variants": []map[string]any{
			{"price": price, "optionValues": []map[string]any{{"optionName": "Title", "name": "Default Title"}}},
		},
	}
	if description != "" {
		input["descriptionHtml"] = "<p>" + description + "</p>"
	}
	variables := map[string]any{"input": input}

	var data struct {
		ProductSet struct {
			Product struct {
				ID       string `json:"id"`
				Variants struct {
					Nodes []struct {
						ID string `json:"id"`
					} `json:"nodes"`
				} `json:"variants"`
			} `json:"product"`
			UserErrors []userError `json:"userErrors"`
		} `json:"productSet"`
	}
	if err := c.Query(ctx, query, variables, &data); err != nil {
		return "", "", err
	}
	if err := checkUserErrors("productSet", data.ProductSet.UserErrors); err != nil {
		return "", "", err
	}
	if len(data.ProductSet.Product.Variants.Nodes) == 0 {
		return "", "", fmt.Errorf("productSet: no variant returned for %s", title)
	}
	return data.ProductSet.Product.ID, data.ProductSet.Product.Variants.Nodes[0].ID, nil
}

func (c *Client) createSellingPlanGroup(ctx context.Context, suffix string, productIDs []string) error {
	query := `mutation($input: SellingPlanGroupInput!, $resources: SellingPlanGroupResourceInput) {
		sellingPlanGroupCreate(input: $input, resources: $resources) {
			sellingPlanGroup { id }
			userErrors { field message }
		}
	}`
	variables := map[string]any{
		"input": map[string]any{
			"name":         "Abonnement 12 mois",
			"merchantCode": fmt.Sprintf("abo-12-mois-%s", suffix),
			"options":      []string{"Engagement"},
			"sellingPlansToCreate": []map[string]any{
				{
					"name":     "Une box passion chaque mois pendant 12 mois",
					"options":  []string{"12 mois"},
					"category": "SUBSCRIPTION",
					"billingPolicy": map[string]any{
						"recurring": map[string]any{"interval": "MONTH", "intervalCount": 1, "minCycles": 12},
					},
					"deliveryPolicy": map[string]any{
						"recurring": map[string]any{"interval": "MONTH", "intervalCount": 1},
					},
					"pricingPolicies": []map[string]any{
						{
							"fixed": map[string]any{
								"adjustmentType":  "PERCENTAGE",
								"adjustmentValue": map[string]any{"percentage": 10.0},
							},
						},
					},
				},
			},
		},
		"resources": map[string]any{"productIds": productIDs},
	}

	var data struct {
		SellingPlanGroupCreate struct {
			UserErrors []userError `json:"userErrors"`
		} `json:"sellingPlanGroupCreate"`
	}
	if err := c.Query(ctx, query, variables, &data); err != nil {
		return err
	}
	return checkUserErrors("sellingPlanGroupCreate", data.SellingPlanGroupCreate.UserErrors)
}

func (c *Client) createCustomer(ctx context.Context, firstName, lastName, suffix string) (string, error) {
	query := `mutation($input: CustomerInput!) {
		customerCreate(input: $input) {
			customer { id }
			userErrors { field message }
		}
	}`
	email := fmt.Sprintf("%s.%s+%s@example.com", slugify(firstName), slugify(lastName), suffix)
	variables := map[string]any{
		"input": map[string]any{
			"firstName": firstName,
			"lastName":  lastName,
			"email":     email,
		},
	}

	var data struct {
		CustomerCreate struct {
			Customer struct {
				ID string `json:"id"`
			} `json:"customer"`
			UserErrors []userError `json:"userErrors"`
		} `json:"customerCreate"`
	}
	if err := c.Query(ctx, query, variables, &data); err != nil {
		return "", err
	}
	if err := checkUserErrors("customerCreate", data.CustomerCreate.UserErrors); err != nil {
		return "", err
	}
	return data.CustomerCreate.Customer.ID, nil
}

func (c *Client) createOrder(ctx context.Context, in OrderSpec) error {
	query := `mutation($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
		orderCreate(order: $order, options: $options) {
			order { id }
			userErrors { field message }
		}
	}`
	order := map[string]any{
		"processedAt":     in.ProcessedAt,
		"financialStatus": "PAID",
		"customer":        map[string]any{"toAssociate": map[string]any{"id": in.CustomerID}},
		"lineItems": []map[string]any{
			{"variantId": in.VariantID, "quantity": in.Quantity},
		},
	}
	if len(in.Tags) > 0 {
		order["tags"] = in.Tags
	}
	if in.ContractID != "" {
		order["note"] = fmt.Sprintf("Contrat %s", in.ContractID)
		order["customAttributes"] = []map[string]any{{"key": "contract_id", "value": in.ContractID}}
	}
	variables := map[string]any{
		"order":   order,
		"options": map[string]any{"inventoryBehaviour": "BYPASS", "sendReceipt": false},
	}

	var data struct {
		OrderCreate struct {
			UserErrors []userError `json:"userErrors"`
		} `json:"orderCreate"`
	}
	if err := c.Query(ctx, query, variables, &data); err != nil {
		return err
	}
	return checkUserErrors("orderCreate", data.OrderCreate.UserErrors)
}

type userError struct {
	Field   []string `json:"field"`
	Message string   `json:"message"`
}

func checkUserErrors(operation string, errs []userError) error {
	if len(errs) == 0 {
		return nil
	}
	return fmt.Errorf("%s: %s", operation, errs[0].Message)
}

func slugify(s string) string {
	replacements := map[rune]rune{
		'à': 'a', 'â': 'a', 'ä': 'a',
		'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
		'î': 'i', 'ï': 'i',
		'ô': 'o', 'ö': 'o',
		'ù': 'u', 'û': 'u', 'ü': 'u',
		'ç': 'c',
	}
	out := make([]rune, 0, len(s))
	for _, r := range s {
		if repl, ok := replacements[r]; ok {
			r = repl
		}
		switch {
		case r >= 'a' && r <= 'z' || r >= '0' && r <= '9':
			out = append(out, r)
		case r >= 'A' && r <= 'Z':
			out = append(out, r+32)
		case r == ' ' || r == '\'' || r == '-':
			if len(out) > 0 && out[len(out)-1] != '-' {
				out = append(out, '-')
			}
		}
	}
	return string(out)
}
