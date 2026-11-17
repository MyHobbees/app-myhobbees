# Testing

## Strategy

- Unit tests across the Go API. Four frontend component-test suites exist so far: `src/pages/admins.test.tsx` (create-form submit, delete-confirm/cancel), `src/pages/credential-share.test.tsx`, `src/pages/dev-tools.test.tsx` (seed/cleanup quantity form, error display), and `src/components/layout/app-layout.test.tsx` (the `stgOnly` nav filter) — added because no browser-automation tool is available in this environment to exercise those click paths directly, see [auth.md](auth.md). No other integration, e2e, or frontend tests exist in any of the three frontends.

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
- State: `leads` fixtures are seeded and torn down through the API's own endpoints, `POST /v1/leads/seed?count=N` and `DELETE /v1/leads/seed`, both blocked everywhere except `APP_ENV=stg`; see [deployment.md](deployment.md) for how the back-office detects stg to show the "Outils dev" page at all
