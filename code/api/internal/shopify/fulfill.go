package shopify

import (
	"context"
	"errors"
)

const PreparationTag = "en-preparation"

func (c *Client) PrepareOrder(ctx context.Context, id string) error {
	query := `mutation($id: ID!, $tags: [String!]!) {
		tagsAdd(id: $id, tags: $tags) {
			userErrors { field message }
		}
	}`
	variables := map[string]any{
		"id":   "gid://shopify/Order/" + id,
		"tags": []string{PreparationTag},
	}

	var data struct {
		TagsAdd struct {
			UserErrors []userError `json:"userErrors"`
		} `json:"tagsAdd"`
	}
	if err := c.Query(ctx, query, variables, &data); err != nil {
		return err
	}
	return checkUserErrors("tagsAdd", data.TagsAdd.UserErrors)
}

func (c *Client) FulfillOrder(ctx context.Context, id string) error {
	listQuery := `query($id: ID!) {
		order(id: $id) {
			fulfillmentOrders(first: 10) {
				nodes { id status }
			}
		}
	}`
	variables := map[string]any{"id": "gid://shopify/Order/" + id}

	var listData struct {
		Order *struct {
			FulfillmentOrders struct {
				Nodes []struct {
					ID     string `json:"id"`
					Status string `json:"status"`
				} `json:"nodes"`
			} `json:"fulfillmentOrders"`
		} `json:"order"`
	}
	if err := c.Query(ctx, listQuery, variables, &listData); err != nil {
		return err
	}
	if listData.Order == nil {
		return errors.New("commande introuvable")
	}

	lineItemsByFulfillmentOrder := []map[string]any{}
	for _, fo := range listData.Order.FulfillmentOrders.Nodes {
		if fo.Status == "OPEN" || fo.Status == "IN_PROGRESS" {
			lineItemsByFulfillmentOrder = append(lineItemsByFulfillmentOrder, map[string]any{
				"fulfillmentOrderId": fo.ID,
			})
		}
	}
	if len(lineItemsByFulfillmentOrder) == 0 {
		return errors.New("aucun fulfillment order ouvert pour cette commande")
	}

	mutation := `mutation($fulfillment: FulfillmentInput!) {
		fulfillmentCreate(fulfillment: $fulfillment) {
			fulfillment { id status }
			userErrors { field message }
		}
	}`
	fulfillVariables := map[string]any{
		"fulfillment": map[string]any{
			"lineItemsByFulfillmentOrder": lineItemsByFulfillmentOrder,
			"notifyCustomer":              false,
		},
	}

	var data struct {
		FulfillmentCreate struct {
			UserErrors []userError `json:"userErrors"`
		} `json:"fulfillmentCreate"`
	}
	if err := c.Query(ctx, mutation, fulfillVariables, &data); err != nil {
		return err
	}
	return checkUserErrors("fulfillmentCreate", data.FulfillmentCreate.UserErrors)
}
