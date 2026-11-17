# Review: Partage sécurisé des identifiants d'un admin créé

- **Verdict**: approve
- **Diff**: `3d4994ef...7e98a082` (5 commits: `d28a3548`, `0d577949`, `4ca642c5`, `539b1a53`, `7e98a082`)
- **Axes run**: code, functional, relevancy
- **Date**: 2026_11_17
- **Findings**: 0 critical, 0 warning, 2 minor

## Phases

### Phase 1 — API : mot de passe généré, token chiffré, route de partage

- [x] `003_create_credential_shares.sql` applies on a base already at 002 — `code/database/migrations/003_create_credential_shares.sql:1-5`; live `information_schema` query confirms the table's columns are exactly `id, created_at, consumed_at` — no column exists that could hold a secret
- [x] `credentialshare` tests cover round-trip, tampering, wrong key, expiry — `code/api/internal/credentialshare/credentialshare_test.go`. Independently confirmed on the real production path: 40 tokens minted through the live API had 40/40 distinct 12-byte nonces, 40/40 distinct ciphertexts, no all-zero nonce, mean consecutive bit-difference 48.7/96 (CSPRNG signature, not a counter). A one-character tamper returns 404
- [x] `ValidateShareSecret` covers valid/invalid sizes — `code/api/internal/auth/auth.go:38-51`, `code/api/internal/auth/auth_test.go`
- [x] Creating with `{"email":...}` and no password answers 201 with a `shareToken` and no plaintext — verified live: `{"admin":{...},"shareToken":"...156 chars..."}`, zero `"password"` keys
- [x] Route tests cover the 7 Test Scope scenarios including concurrent reads — `code/api/internal/routes/credential_shares_test.go`. Re-proved live against the **new POST route**, harder than the committed 2-goroutine test: 12 rounds × 6 genuinely parallel requests on the same fresh token gave **exactly one 200 and five 404s every round, 0 violations**, 12 consumed rows
- [x] Starting without `CREDENTIAL_SHARE_SECRET`, or at the wrong size, fails immediately with an explicit message — verified against the real `cmd/server` binary on five `.env` variants: absent, empty, 31 and 33 bytes all `exit=1` with the byte count named; exactly 32 boots. `cmd/api/main.go:18-20` carries the identical guard
- [x] `go vet ./...` and `go test ./...` pass on `code/api` — re-run at `539b1a53`: vet exit 0; 79 subtests, 57 top-level, 0 failed, **0 skipped**

### Phase 2 — Back-office : drawer de création, page publique de partage

- [x] No type error on the new types — `npm run build` (`tsc -b && vite build`) green
- [x] Manual scenario: create an admin in the drawer, see the link, copy it — covered by `src/pages/admins.test.tsx`, real DOM and real Radix `Sheet`
- [x] Manual scenario: open the link with no session, see email+password; reload, see the generic error — **the regression from the two snapshots ago is fixed, and `7e98a082` then removed the whole failure class rather than guarding it**. Consumption no longer happens on mount at all: an `idle` state renders a "Révéler les identifiants" button and only its `onClick` spends the token (`src/pages/credential-share.tsx:33-60`, `:70-83`). Verified independently at each stage — my byte-identical StrictMode probe went `calls: 2` (pre-fix) → `calls: 1` (ref guard) → and the committed `does not call getCredentialShare on mount, even under StrictMode` now asserts **0** calls until the click. Live, a second and third consume of the same token both return 404 while the first returns the credentials
- [x] Navigating to `/credential/un-token-invalide` without a session does not redirect to `/login` — `src/router.tsx:23` registers it as a top-level sibling of `/login`, not a child of the `/` route whose element is `ProtectedRoute`
- [x] `npm run test`, `npm run lint`, `npm run build` all green — re-run at `7e98a082`: 8 tests across 2 files pass; lint emits only the 4 pre-existing `only-export-components` warnings on untouched `ui/` files; build clean

## Findings

| Sev | Kind | Phase | Location | Issue | Fix |
| --- | ---- | ----- | -------- | ----- | --- |
| 🟢 | rot | 1 | `code/api/internal/routes/admins.go:152` | Stale symbol name in a comment: "only until **GetCredentialShare** consumes it once". That handler was renamed to `ConsumeCredentialShare` in `4ca642c5`, and `7e98a082` was front-only so it is still open. (The other two hits are fine: `credential_shares_test.go:236` says "GetCredentialShare *used to*…", deliberately historical, and `phase-1.md:123` is the original instruction, which should not be rewritten retroactively) | Rename to `ConsumeCredentialShare` in that comment |
| 🟢 | rot | 2 | `code/www-back-office/src/pages/credential-share.tsx:73-74` vs `:141` | The same component addresses the reader two different ways, seconds apart: the new pre-reveal warning uses informal *tu* ("Ne **clique** que si **tu** es prêt·e"), while the post-reveal warning right below it uses formal *vous* ("**enregistrez** ces identifiants"). The same person reads both in one sitting. These are the only two imperative verbs in the whole back-office, so there is no prior convention to appeal to — but they should at least agree with each other | Pick one voice and apply it to both strings |

## Verification

| Metric        | Value                                             |
| ------------- | ------------------------------------------------- |
| Verified      | 100% (12/12)                                       |
| Files checked | `code/database/migrations/003_create_credential_shares.sql`, `code/api/internal/credentialshare/credentialshare.go`, `code/api/internal/credentialshare/credentialshare_test.go`, `code/api/internal/routes/credential_shares.go`, `code/api/internal/routes/credential_shares_test.go`, `code/api/internal/routes/admins.go`, `code/api/internal/routes/admins_test.go`, `code/api/internal/auth/auth.go`, `code/api/internal/auth/auth_test.go`, `code/api/internal/app/app.go`, `code/api/cmd/api/main.go`, `code/api/cmd/server/main.go`, `code/api/.env.example`, `code/www-back-office/src/pages/credential-share.tsx`, `code/www-back-office/src/pages/credential-share.test.tsx`, `code/www-back-office/src/pages/admins.tsx`, `code/www-back-office/src/pages/admins.test.tsx`, `code/www-back-office/src/lib/api.ts`, `code/www-back-office/src/router.tsx`, `code/www-back-office/src/main.tsx`, `aidd_docs/memory/auth.md`, `infrastructure/terraform/` (CDN logging) |
| Unchecked     | none                                               |
| Unplanned     | `7e98a082` moves consumption from a mount effect to an explicit "Révéler les identifiants" click and hardens both warning strings — not in the plan, applied from the challenge pass's two leading suggestions. It is strictly better than the `useRef` guard it replaces: nothing can "load" a click, so React.StrictMode and JS-executing link scanners (Defender Safe Links, Proofpoint) are both excluded by construction rather than by guarding one known trigger. The click gate introduces one new risk nothing in the suite covers — a human double-clicking the button — which I probed separately: `user.dblClick` yields exactly **1** call and no error state, because `setState({status:'loading'})` unmounts the `idle` branch holding the button before a second click can land. The HTTP verb change (`GET /{token}` → `POST` with the token in the body) was not in the plan; it is the fix for the previous snapshot's log-leak warning and is the better semantic fit for a non-idempotent mutation. It introduces a CORS preflight a simple GET never needed — **verified live**: `OPTIONS /v1/credential-shares` returns `204` with `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS` and `Allow-Headers: *` from the existing global preflight middleware, so the cross-origin browser path still works. The old GET route is gone (`404`). `aidd_docs/memory/auth.md` was extended beyond phase 2's scope, accurately on every point checked, including the mermaid edge. No debug leftovers in any changed file; working tree clean apart from this report; `code/api/.env` exists only as a gitignored local file created for live testing. Process note: before trusting any live result I asserted the target port was free and the bind succeeded, and confirmed the running process was the HEAD build by checking the removed GET route 404s — the stale-server trap that voided a run in the previous snapshot did not recur |
