# Review: Gestion multi-admins du back-office

- **Verdict**: approve
- **Diff**: `6a1dc50c...feat/back-office-multi-admins` (10 commits: 4 original + 5 fix rounds + this report)
- **Axes run**: code, functional, relevancy
- **Date**: 2026_11_17
- **Findings**: 0 critical, 0 warning, 0 minor

## Phases

### Phase 1 — Table admins, login migré, bootstrap du super-admin

- [x] `002_create_admins.sql` applies on a clean base — `code/database/migrations/002_create_admins.sql:1-7`; `psql \d admins` returns exactly the planned shape (`admins_pkey`, unique `admins_email_key`, `is_super_admin` default false); filename matches `MIGRATION_PATTERN` in `infrastructure/scripts/migrate.py:11`
- [x] `go test ./internal/jwt/...` passes, round-trip asserts `IsSuperAdmin` — `code/api/internal/jwt/jwt.go:14`, `code/api/internal/jwt/jwt_test.go`
- [x] Bootstrap covers the 3 scoped cases against a real base — `code/api/internal/routes/admins_test.go:64,89,106`; re-run here, all `--- PASS`, 0 skipped
- [x] Login on a freshly migrated base issues a JWT with the real id and `isSuperAdmin` — `code/api/internal/routes/auth.go:59`. Re-verified live on the current branch against an empty `admins` table with the real `code/api/.env`: one login attempt bootstrapped exactly 1 row, `is_super_admin=t`, `password_hash` byte-identical to the env value (60 chars, `$2y$`, cost 10 after `godotenv` strips the quotes), `email == lower(ADMIN_EMAIL)` and the env value was already lowercase, so the stored identity is unchanged by the new normalisation. A wrong password returned `401`, never a 502
- [x] `go vet ./...` and `go test ./...` pass on `code/api` — re-run here: vet exit 0; 43 tests, 0 failed, 0 skipped

### Phase 2 — API de gestion des admins (super-admin only)

- [x] `RequireSuperAdmin` passes a super-admin, 403 otherwise — `code/api/internal/auth/auth.go:75-84`, `code/api/internal/auth/auth_test.go:208,228,248`
- [x] The 7 Test Scope scenarios are covered — `code/api/internal/routes/admins_test.go`; all `--- PASS` against the real base, now joined by `TestAdmins_DeletedSuperAdminTokenIsRejectedLive`, `TestAdmins_DuplicateEmailIsCaseInsensitive`, `TestAdmins_CreateStoresEmailLowercased`, `TestAdmins_CreateRejectsShortPassword`
- [x] A non-super-admin gets 403 on `/v1/admins` and keeps `/v1/leads` + `/v1/analytics/*` — `code/api/internal/app/app.go:67-70`, `code/api/internal/app/app_test.go:98-119`. Re-confirmed live on the current branch with the new live guard in place: plain admin → `/v1/admins` 403, `/v1/leads` 200, `/v1/analytics/posthog/overview?days=30` 200
- [x] `go vet ./...` and `go test ./...` pass — re-run here, green

### Phase 3 — Page back-office « Administrateurs »

- [x] `localStorage['back-office-auth']` carries `isSuperAdmin` after login — `code/www-back-office/src/stores/auth.ts:7,17-19`, `src/pages/login.tsx:37`
- [x] No type error on the new types — `npm run build` (`tsc -b && vite build`) green, `✓ built in 315ms`
- [x] `alert-dialog.tsx` exists and exports the primitives used — `code/www-back-office/src/components/ui/alert-dialog.tsx:1-197`
- [x] Manual scenario: create an admin through the form, see it appear; delete it through the dialog, see it disappear — closed at the component level by `code/www-back-office/src/pages/admins.test.tsx:33,66,84` (real DOM, real React state, real Radix `AlertDialog` driven by `user-event`; only `@/lib/api` mocked), covering create-then-append, confirm-then-remove, and cancel-makes-no-call. `npm test` → 3 passed. Still not a real browser (none is available in this environment), but the click path itself is now exercised rather than assumed
- [x] No « Administrateurs » entry for a non-super-admin; lint and build pass — `src/components/layout/app-layout.tsx:143-145`; `npm run lint` emits only the 4 pre-existing `only-export-components` warnings on untouched `ui/` files

### Phase 4 — Nettoyage des variables d'env et de la mémoire projet

- [x] `.env.example` no longer implies a direct login check — `code/api/.env.example:20-23`
- [x] `auth.md` describes the implemented behavior with no stale single-admin mention — `aidd_docs/memory/auth.md:5-6,16-19`; `:19` now describes `requireLiveSuperAdmin` and correctly scopes the residual 24h lag to the non-admin routes only, matching what was observed live

## Findings

None.

<!-- All 12 findings from the previous snapshot are fixed and re-verified independently.
     🔴 deleted-admin privilege retention — `code/api/internal/routes/admins.go:136-174` (`requireLiveSuperAdmin`, mounted via `r.Use` inside `Admins()` so the scope holds however it is mounted). Reproduced live end to end on the current branch: super-admin #2 created (201) → its token works (GET /v1/admins 200, control) → #1 deletes #2 (204) → the SAME unexpired token now gets 403 on GET, POST and DELETE across /v1/admins/*, while GET /v1/leads stays 200, and no ghost admin row was created. A legacy pre-migration token (`sub:"admin"`, claiming super-admin) also fails closed on /v1/admins (403) via the `ParseInt` guard, keeping /v1/leads.
     🔴 deploy ordering — `.github/workflows/ci-cd.yml:163,349`: `deploy-api-<env>` now needs `[terraform-api-<env>, migrate-database-<env>]`, stg and prd. No dependency cycle, and all three jobs carry the identical `if:` so none is skipped out from under a dependent.
     🟡 architecture.md:23, 🟡 api.md:11,24, 🟡 database.md:11, plus deployment.md and testing.md — all rewritten, each linking to `auth.md` as the canonical home rather than restating it.
     🟡 dialog copy — `src/pages/admins.tsx:239-242` now states admin-management rights end immediately and general access ends with the token (under 24h), which is exactly the observed behavior.
     🟡 email case — lowercased on create (`admins.go:198`), on login (`auth.go:46`) and on bootstrap (`admins.go:76`). Live: `Twelve@Test.FR` stored as `twelve@test.fr`, the lowercase duplicate rejected 400.
     🟡 password floor — `minAdminPasswordLength = 12` (`admins.go:94`), mirrored by `minLength` + helper text on the form. Live: 11 chars 400, 12 chars 201.
     🟢 `ON CONFLICT (email) DO NOTHING` on the bootstrap insert; 🟢 `deleteAdmin` selects only `is_super_admin`; 🟢 login trims the submitted email; 🟢 sidebar block re-indented. -->

## Verification

| Metric        | Value                                             |
| ------------- | ------------------------------------------------- |
| Verified      | 100% (16/16)                                       |
| Files checked | `code/database/migrations/002_create_admins.sql`, `code/api/internal/routes/admins.go`, `code/api/internal/routes/admins_test.go`, `code/api/internal/routes/auth.go`, `code/api/internal/routes/auth_test.go`, `code/api/internal/auth/auth.go`, `code/api/internal/app/app.go`, `code/api/internal/app/app_test.go`, `code/api/internal/jwt/jwt.go`, `code/api/.env.example`, `code/www-back-office/src/pages/admins.tsx`, `code/www-back-office/src/pages/admins.test.tsx`, `code/www-back-office/src/test/setup.ts`, `code/www-back-office/vite.config.ts`, `code/www-back-office/package.json`, `code/www-back-office/src/lib/api.ts`, `code/www-back-office/src/stores/auth.ts`, `code/www-back-office/src/router.tsx`, `code/www-back-office/src/components/layout/app-layout.tsx`, `code/www-back-office/src/components/ui/alert-dialog.tsx`, `aidd_docs/memory/{auth,architecture,api,database,deployment,testing,coding-assertions}.md`, `.github/workflows/ci-cd.yml`, `infrastructure/scripts/{migrate,deploy.react}.py` |
| Unchecked     | none                                               |
| Unplanned     | Vitest + `@testing-library` + jsdom added as devDependencies and `vite.config.ts` switched to `vitest/config` — out of the original plan's scope but a direct answer to the phase-3 gap; no production impact, since `deploy.react.py:139` runs a plain `npm install` (devDependencies included) before `npm run build`, and the build is green. `npm audit` reports 25 vulnerabilities (8 moderate, 16 high, 1 critical) — byte-for-byte the same count as on the pre-fix lockfile, so the new devDependencies introduce none; pre-existing debt, out of scope for this chantier. `aidd_docs/memory/testing.md` and `coding-assertions.md` updated outside phase 4's declared scope, correctly, to register the new suite. No scratch tooling leaked: `cmd/minttoken` never entered history, `git ls-files code/api/cmd` lists only `api/main.go` and `server/main.go`, working tree clean, no debug leftovers in any changed `.go`/`.ts`/`.tsx` file |
