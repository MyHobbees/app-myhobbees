# Auth

## Authentication

- Real `admins` table (`code/database/migrations/002_create_admins.sql`: `id`, `email` unique, `password_hash` bcrypt, `is_super_admin`, `created_at`), not a single env-backed identity: `POST /v1/auth/login` checks email/password against that table (`code/api/internal/routes/auth.go`, `findAdminByEmail` + `bcrypt.CompareHashAndPassword`), then issues an HS256 JWT (`code/api/internal/jwt`, `golang-jwt/v5`) signed with `JWT_SECRET`, carrying the admin's real id as `sub` and an `isSuperAdmin` claim
- `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` are bootstrap-only: on every login attempt, `bootstrapFirstSuperAdmin` (`code/api/internal/routes/admins.go`) inserts one super-admin row from those env vars, but only while `admins` is still empty; once any row exists they are never read again. This exists so a fresh environment (local, stg, or a freshly migrated prod) always has a way to create its first admin, since the admin-management page itself requires being logged in as a super-admin already

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
- A role change (promotion, demotion, or deletion) only takes effect on that admin's next login, since the role is read from the JWT claim set at sign time, not re-checked against the database per request — acceptable for an internal back-office

## Sessions

- Token TTL is 24h, no refresh endpoint; `www-back-office` persists the token client-side via `zustand/persist` (`src/stores/auth.ts`, localStorage key `back-office-auth`)
