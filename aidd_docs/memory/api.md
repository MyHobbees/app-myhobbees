# API

## Style

- REST over HTTP, `chi` router (`code/api/internal/app/app.go`), routes defined one file per group under `code/api/internal/routes/`
- Everything but `/health` is mounted under `/v1`; no further versioning

## Resources

- `/health`: liveness probe, no auth
- `/v1/auth`: `POST /login`, admin-only credential check, issues a JWT — see [auth.md](auth.md)
- `/v1/example`: sample protected routes (`/me`, `/db-check`) kept as a reference pattern
- `/v1/shopify`: status, analytics, orders, products, customers, and seed/cleanup endpoints proxying the Shopify Admin API — see [integration.md](integration.md)

## Contracts

- No OpenAPI spec; the contract is the handler code
- Every response is JSON through `internal/httpjson`: `OK(w, status, v)` for success, `Error(w, status, message)` for `{"error": message}`
- No pagination convention; list endpoints (e.g. `/v1/shopify/orders`) return the full Shopify result set
- All routes except `/health` and `/v1/auth/login` require `Authorization: Bearer <jwt>` via `auth.Middleware`
