# API

## Style

- REST over HTTP, `chi` router (`code/api/internal/app/app.go`), routes defined one file per group under `code/api/internal/routes/`
- Everything but `/health` is mounted under `/v1`; no further versioning

## Resources

- `/health`: liveness probe, no auth
- `/v1/auth`: `POST /login`, admin-only credential check, issues a JWT — see [auth.md](auth.md)
- `/v1/example`: sample protected routes (`/me`, `/db-check`) kept as a reference pattern
- `/v1/shopify`: status, analytics, orders, products, customers, and seed/cleanup endpoints proxying the Shopify Admin API — see [integration.md](integration.md)
- `/v1/leads`: `POST /`, public, stores a `www-shop` "Me prévenir" pre-launch form submission — see [database.md](database.md); `GET /`, protected, lists submissions for the back-office
- `/v1/analytics`: `GET /posthog/overview`, protected, PostHog HogQL-derived overview (visitors, event counts, pageviews by day) cached per period; the "visitor → email" rate is sourced from the `leads` table count, not the PostHog event, for reliability

## Contracts

- No OpenAPI spec; the contract is the handler code
- Every response is JSON through `internal/httpjson`: `OK(w, status, v)` for success, `Error(w, status, message)` for `{"error": message}`
- No pagination convention; list endpoints (e.g. `/v1/shopify/orders`) return the full Shopify result set
- `/v1` is protected by default (`auth.Middleware` wraps a `r.Group` in `app.go`); `/health`, `/v1/auth/login`, and `POST /v1/leads` are the only explicit public exceptions — everything else under `/v1`, including `GET /v1/leads` and all of `/v1/analytics`, requires `Authorization: Bearer <jwt>`
- An unauthenticated route (`/v1/leads`) never returns a raw internal error (DB error strings, etc.) to the caller — log it server-side and return a generic message instead
