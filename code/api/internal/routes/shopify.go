package routes

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"

	"github.com/myhobbees/api/internal/auth"
	"github.com/myhobbees/api/internal/httpjson"
	"github.com/myhobbees/api/internal/shopify"
)

func Shopify() chi.Router {
	r := chi.NewRouter()
	r.Use(auth.Middleware)

	r.Get("/status", func(w http.ResponseWriter, req *http.Request) {
		client, err := shopify.FromEnv()
		if err != nil {
			if errors.Is(err, shopify.ErrNotConfigured) {
				httpjson.OK(w, http.StatusOK, map[string]any{
					"connected": false,
					"error":     "not configured",
				})
				return
			}
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}

		var data struct {
			Shop struct {
				Name            string `json:"name"`
				MyshopifyDomain string `json:"myshopifyDomain"`
				CurrencyCode    string `json:"currencyCode"`
				Plan            struct {
					DisplayName string `json:"displayName"`
				} `json:"plan"`
			} `json:"shop"`
		}
		query := `{ shop { name myshopifyDomain currencyCode plan { displayName } } }`
		if err := client.Query(req.Context(), query, nil, &data); err != nil {
			httpjson.OK(w, http.StatusBadGateway, map[string]any{
				"connected": false,
				"error":     err.Error(),
			})
			return
		}

		httpjson.OK(w, http.StatusOK, map[string]any{
			"connected":  true,
			"apiVersion": shopify.APIVersion,
			"shop": map[string]string{
				"name":     data.Shop.Name,
				"domain":   data.Shop.MyshopifyDomain,
				"currency": data.Shop.CurrencyCode,
				"plan":     data.Shop.Plan.DisplayName,
			},
		})
	})

	r.Get("/analytics", func(w http.ResponseWriter, req *http.Request) {
		client, ok := shopifyClient(w)
		if !ok {
			return
		}
		days := 30
		switch req.URL.Query().Get("days") {
		case "7":
			days = 7
		case "90":
			days = 90
		}
		analytics, err := client.Analytics(req.Context(), days)
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		httpjson.OK(w, http.StatusOK, analytics)
	})

	r.Get("/orders", func(w http.ResponseWriter, req *http.Request) {
		client, ok := shopifyClient(w)
		if !ok {
			return
		}
		orders, err := client.Orders(req.Context())
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		httpjson.OK(w, http.StatusOK, orders)
	})

	r.Get("/orders/{id}", func(w http.ResponseWriter, req *http.Request) {
		client, ok := shopifyClient(w)
		if !ok {
			return
		}
		order, err := client.Order(req.Context(), chi.URLParam(req, "id"))
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		if order == nil {
			httpjson.Error(w, http.StatusNotFound, "Commande introuvable")
			return
		}
		httpjson.OK(w, http.StatusOK, order)
	})

	r.Post("/orders/{id}/prepare", func(w http.ResponseWriter, req *http.Request) {
		client, ok := shopifyClient(w)
		if !ok {
			return
		}
		if err := client.PrepareOrder(req.Context(), chi.URLParam(req, "id")); err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		httpjson.OK(w, http.StatusOK, map[string]bool{"ok": true})
	})

	r.Post("/orders/{id}/fulfill", func(w http.ResponseWriter, req *http.Request) {
		client, ok := shopifyClient(w)
		if !ok {
			return
		}
		if err := client.FulfillOrder(req.Context(), chi.URLParam(req, "id")); err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		httpjson.OK(w, http.StatusOK, map[string]bool{"ok": true})
	})

	r.Get("/products", func(w http.ResponseWriter, req *http.Request) {
		client, ok := shopifyClient(w)
		if !ok {
			return
		}
		products, err := client.Products(req.Context())
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		httpjson.OK(w, http.StatusOK, products)
	})

	r.Get("/products/{id}", func(w http.ResponseWriter, req *http.Request) {
		client, ok := shopifyClient(w)
		if !ok {
			return
		}
		product, err := client.Product(req.Context(), chi.URLParam(req, "id"))
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		if product == nil {
			httpjson.Error(w, http.StatusNotFound, "Produit introuvable")
			return
		}
		httpjson.OK(w, http.StatusOK, product)
	})

	r.Get("/customers", func(w http.ResponseWriter, req *http.Request) {
		client, ok := shopifyClient(w)
		if !ok {
			return
		}
		customers, err := client.Customers(req.Context())
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		httpjson.OK(w, http.StatusOK, customers)
	})

	r.Get("/customers/{id}", func(w http.ResponseWriter, req *http.Request) {
		client, ok := shopifyClient(w)
		if !ok {
			return
		}
		customer, err := client.Customer(req.Context(), chi.URLParam(req, "id"))
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		if customer == nil {
			httpjson.Error(w, http.StatusNotFound, "Client introuvable")
			return
		}
		httpjson.OK(w, http.StatusOK, customer)
	})

	r.Post("/seed", func(w http.ResponseWriter, req *http.Request) {
		client, ok := seedClient(w)
		if !ok {
			return
		}

		result, err := client.SeedBase(req.Context())
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		httpjson.OK(w, http.StatusOK, result)
	})

	r.Post("/seed/cleanup", func(w http.ResponseWriter, req *http.Request) {
		client, ok := seedClient(w)
		if !ok {
			return
		}

		result, err := client.Cleanup(req.Context())
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		httpjson.OK(w, http.StatusOK, result)
	})

	r.Post("/seed/orders", func(w http.ResponseWriter, req *http.Request) {
		client, ok := seedClient(w)
		if !ok {
			return
		}

		var body struct {
			Orders []shopify.OrderSpec `json:"orders"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil || len(body.Orders) == 0 {
			httpjson.Error(w, http.StatusBadRequest, "Invalid body")
			return
		}

		result, err := client.SeedOrders(req.Context(), body.Orders)
		if err != nil {
			httpjson.Error(w, http.StatusBadGateway, err.Error())
			return
		}
		httpjson.OK(w, http.StatusOK, result)
	})

	return r
}

func shopifyClient(w http.ResponseWriter) (*shopify.Client, bool) {
	client, err := shopify.FromEnv()
	if err != nil {
		if errors.Is(err, shopify.ErrNotConfigured) {
			httpjson.Error(w, http.StatusConflict, "Shopify non configuré")
			return nil, false
		}
		httpjson.Error(w, http.StatusBadGateway, err.Error())
		return nil, false
	}
	return client, true
}

func seedClient(w http.ResponseWriter) (*shopify.Client, bool) {
	if os.Getenv("APP_ENV") == "prd" {
		httpjson.Error(w, http.StatusForbidden, "Seed interdit en production")
		return nil, false
	}
	return shopifyClient(w)
}
