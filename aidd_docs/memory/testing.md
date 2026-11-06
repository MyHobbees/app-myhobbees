# Testing

## Strategy

- Unit tests only, and only in the Go API so far (`code/api/internal/jwt`). No integration, e2e, or frontend tests exist in any of the three frontends.

## Tools

- Go standard `testing` package, no assertion library, no mocking, no coverage tooling wired up.

## Conventions

- A Go package's tests live beside it as `<file>_test.go`.

## Run

- `cd code/api && go test ./...`

## Browser QA

- Entry: `cd code/www-back-office && npm run dev` (Vite); `cd code/www-shop && npm run dev` (`shopify hydrogen dev`)
- Auth: back-office logs in via `POST /v1/auth/login` against the `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` env pair — see [auth.md](auth.md)
- State: Shopify fixtures are seeded and torn down through the API's own endpoints, `POST /v1/shopify/seed` and `POST /v1/shopify/seed/cleanup`, both blocked when `APP_ENV=prd`
