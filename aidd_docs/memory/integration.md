# Integration

## External services

- Shopify Admin API (GraphQL, `code/api/internal/shopify/client.go`): orders, products, customers, fulfillment, order seeding — called from `/v1/shopify/*`
- Shopify Storefront API: called directly from `www-shop` (Hydrogen), not through the Go API

## Calling conventions

- Auth: client-credentials OAuth against `/admin/oauth/access_token`; the access token is cached in memory and refreshed ~60s before `expires_in` elapses (`shopify.Client.accessToken`)
- Config: `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` env vars; their absence returns `shopify.ErrNotConfigured` rather than an error, and routes answer `connected: false` instead of failing
- Timeouts: 20s HTTP client timeout, no retry on failure; a GraphQL error or non-200 response is surfaced as-is to the caller
- `POST /v1/shopify/seed*` is refused with 403 when `APP_ENV=prd`
- The Storefront token is scope-locked to the current custom app; a Headless sales channel must be installed manually on the store before the storefront can read it, and seeded products are not published to that channel by default
