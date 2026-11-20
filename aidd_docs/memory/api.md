# API

## Style

- REST over HTTP, `chi` router (`code/api/internal/app/app.go`), routes defined one file per group under `code/api/internal/routes/`
- Everything but `/health` is mounted under `/v1`; no further versioning

## Resources

- `/health`: liveness probe, no auth
- `/v1/auth`: `POST /login`, admin credential check against the `admins` table, issues a JWT — see [auth.md](auth.md)
- `/v1/admins`: `POST /`, `GET /`, `DELETE /{id}` — super-admin only, manages the `admins` table — see [auth.md](auth.md)
- `/v1/example`: sample protected routes (`/me`, `/db-check`) kept as a reference pattern
- `/v1/shopify`: status, analytics, orders, products, customers proxying the Shopify Admin API — see [integration.md](integration.md)
- `/v1/leads`: `POST /`, public, stores a `www-shop` "Me prévenir" pre-launch form submission — see [database.md](database.md); `GET /`, protected, lists submissions for the back-office; `POST /seed` and `DELETE /seed`, protected and additionally gated on `APP_ENV == "stg"` exactly (403 on `loc` and `prd` too), populate/clean test rows directly in Postgres — no Shopify involved, see [deployment.md](deployment.md)
- `/v1/analytics`: `GET /posthog/overview`, protected, PostHog HogQL-derived overview (visitors, event counts, pageviews by day) cached per period; the "visitor → email" rate is sourced from the `leads` table count, not the PostHog event, for reliability
- `/v1/infra/staging`: `GET /status`, `POST /start`, `POST /migrate` — protected, controls the stg RDS instance and its on-demand migrations from the prd back-office; documented in full in [infra.md](infra.md)'s "Staging DB control exception", not duplicated here
- `/v1/app`: `GET /me`, protected by `auth.AppMiddleware` (app-user tokens only, `aud: "app"`) — a placeholder exercising the middleware ahead of GitHub #62's real app-user endpoints; see [auth.md](auth.md)

## Contracts

- No OpenAPI spec; the contract is the handler code
- Every response is JSON through `internal/httpjson`: `OK(w, status, v)` for success, `Error(w, status, message)` for `{"error": message}`
- No pagination convention; list endpoints (e.g. `/v1/shopify/orders`) return the full Shopify result set
- `/v1` is protected by default: `app.go` mounts two sibling `r.Group`s, one wrapped by `auth.Middleware` (admin routes, `aud: "backoffice"` required) and one by `auth.AppMiddleware` (`/v1/app`, `aud: "app"` required) — a token for one audience is rejected (`401`) by the other's group. `/health`, `/v1/auth/login`, `POST /v1/leads`, and `POST /v1/credential-shares` are the only explicit public exceptions — everything else under `/v1`, including `GET /v1/leads` and all of `/v1/analytics`, requires `Authorization: Bearer <jwt>` for its own audience
- `/v1/admins` has an extra layer on top of that: `auth.RequireSuperAdmin` (JWT claim) plus a live DB re-check of the actor (`requireLiveSuperAdmin`), so a deleted or demoted super-admin's still-valid token is rejected immediately, not just at its next login — see [auth.md](auth.md)
- An unauthenticated route (`/v1/leads`) never returns a raw internal error (DB error strings, etc.) to the caller — log it server-side and return a generic message instead
