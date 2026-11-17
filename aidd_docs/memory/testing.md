# Testing

## Strategy

- Unit tests across the Go API. One frontend component-test suite exists so far: `code/www-back-office/src/pages/admins.test.tsx` (create-form submit, delete-confirm/cancel), added because no browser-automation tool is available in this environment to exercise that click path directly — see [auth.md](auth.md). No other integration, e2e, or frontend tests exist in any of the three frontends.

## Tools

- Go: standard `testing` package, no assertion library, no mocking, no coverage tooling wired up.
- `www-back-office`: Vitest + `@testing-library/react`/`user-event` (jsdom environment), network boundary (`@/lib/api`) mocked via `vi.mock`, real DOM/React/Radix otherwise.

## Conventions

- A Go package's tests live beside it as `<file>_test.go`.
- A `www-back-office` component's test lives beside it as `<file>.test.tsx`.

## Run

- `cd code/api && go test ./...`
- `cd code/www-back-office && npm run test`

## Browser QA

- Entry: `cd code/www-back-office && npm run dev` (Vite); `cd code/www-shop && npm run dev` (`shopify hydrogen dev`)
- Auth: back-office logs in via `POST /v1/auth/login` against the `admins` table (bootstrapped from `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` on an empty table) — see [auth.md](auth.md)
- State: Shopify fixtures are seeded and torn down through the API's own endpoints, `POST /v1/shopify/seed` and `POST /v1/shopify/seed/cleanup`, both blocked when `APP_ENV=prd`
