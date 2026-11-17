# Auth

## Authentication

- Real `admins` table (`code/database/migrations/002_create_admins.sql`: `id`, `email` unique, `password_hash` bcrypt, `is_super_admin`, `created_at`), not a single env-backed identity: `POST /v1/auth/login` checks email/password against that table (`code/api/internal/routes/auth.go`, `findAdminByEmail` + `bcrypt.CompareHashAndPassword`), then issues an HS256 JWT (`code/api/internal/jwt`, `golang-jwt/v5`) signed with `JWT_SECRET`, carrying the admin's real id as `sub` and an `isSuperAdmin` claim
- `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` are bootstrap-only: on every login attempt, `bootstrapFirstSuperAdmin` (`code/api/internal/routes/admins.go`) inserts one super-admin row from those env vars, but only while `admins` is still empty; once any row exists they are never read again. This exists so a fresh environment (local, stg, or a freshly migrated prod) always has a way to create its first admin, since the admin-management page itself requires being logged in as a super-admin already
- There is no password-reset or password-change endpoint. If every super-admin's password is lost, the only recovery is `DELETE FROM admins;` directly against the database — the next login attempt re-runs `bootstrapFirstSuperAdmin` against the then-empty table and re-seeds from `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH`. Create a second super-admin right after the first prod login specifically so this manual path stays a theoretical fallback, not the normal recovery route

```mermaid
flowchart LR
    client[back-office] -->|email + password| login[POST /v1/auth/login]
    login -->|bootstrap if admins empty| bootstrap[(admins table)]
    login -->|JWT: sub=id, isSuperAdmin, 24h TTL| client
    client -->|Authorization: Bearer| api[protected routes]
    client -->|Authorization: Bearer, super-admin only| admins[/v1/admins CRUD]
    admins --> bootstrap
```

## Authorization

- Any valid JWT is treated as an admin principal by `auth.Middleware` (`code/api/internal/auth/auth.go`), which exposes `Subject`/`Email`/`IsSuperAdmin` via request context — every route mounted in `app.go`'s protected `/v1` group (`example`, `shopify`, `analytics`, `leads`) stays reachable by any valid admin, regardless of role
- One role, super-admin, gates admin management only: `auth.RequireSuperAdmin` is layered on top of `auth.Middleware` (not instead of it) around `POST/GET/DELETE /v1/admins` (`code/api/internal/routes/admins.go`); a non-super-admin gets `403 Forbidden` there and nowhere else
- Guardrails on `DELETE /v1/admins/{id}`: an admin can never delete itself (`400 Cannot delete yourself`), and the last remaining super-admin can never be deleted (`400 Cannot delete the last super admin`) — the admins table can never end up with zero super-admins through this endpoint
- `requireLiveSuperAdmin` (`code/api/internal/routes/admins.go`) re-checks the actor's row in the database on every `/v1/admins` request, on top of the JWT claim: a deleted or demoted super-admin's still-valid token is rejected there immediately, including an attempt to recreate itself as a super-admin. This is scoped to `/v1/admins` only (one extra query on 3 low-traffic endpoints) — the rest of `/v1` (`leads`, `shopify`, `analytics`) still trusts the JWT claim alone, so a role change or deletion only revokes *general* back-office access (not admin-management power) at that admin's next login, up to 24h later; this residual lag on the non-admin routes is an accepted tradeoff, not an oversight

## Sessions

- Token TTL is 24h, no refresh endpoint; `www-back-office` persists the token client-side via `zustand/persist` (`src/stores/auth.ts`, localStorage key `back-office-auth`), at `version: 1`; a stored session below that version (pre-dating `isSuperAdmin`, and signed without that JWT claim) is cleared by its `migrate` function rather than patched in place, forcing a re-login that actually carries the claim
