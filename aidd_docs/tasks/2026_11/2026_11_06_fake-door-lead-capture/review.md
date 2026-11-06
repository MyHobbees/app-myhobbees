# Review: Fake-door lead capture for www-shop

- **Verdict**: changes-requested
- **Diff**: `cdf45fb7, 9fc3cd03, 9bfff79f, 0537153b` (merge `f03219f0` infra/CI work excluded from scope)
- **Axes run**: code, functional, relevancy
- **Date**: 2026_11_06
- **Findings**: 1 critical, 8 warning, 4 minor

## Phases

### Phase 1 — Leads storage (migration + Go API)

- [x] `001_create_leads.sql` exists and creates a queryable `leads` table with the specified columns — `code/database/migrations/001_create_leads.sql:1-14` (all 10 columns + `leads_created_at_idx`); filename matches `MIGRATION_PATTERN` and its number is unique, and `ensure_app_user` runs after migrations so the app role is granted on the new table (`infrastructure/scripts/migrate.py:138-160`)
- [x] `POST /v1/leads` returns `201` on a valid body and `400` on an incomplete/malformed one, inserting nothing — `code/api/internal/routes/leads.go:54-57` (reject before any DB call), `:83` (201), validation `:28-47`
- [x] The route is public — `code/api/internal/app/app.go:25` mounts `/leads` inside `/v1` with no `auth.Middleware`, and `leads.go:49-51` adds none

### Phase 2 — Fake-door UI, form, and PostHog events

- [x] `capture(...)` before `initPostHog` does not throw and sends nothing — `app/lib/posthog.ts:17` guards on `initialized`, and `:6` returns before setting the flag when `!key`
- [x] `API_BASE_URL` is readable in the action and never reaches a client bundle — `app/lib/context.ts:70`, read in `app/routes/me-prevenir.tsx:95`; verified on a fresh `npm run build`: `grep -rl "API_BASE_URL" build/client/` and `grep -rl "v1/leads" build/client/` both return nothing, both strings appear only in `build/server/.../index.js`
- [x] The header shows "Me prévenir" instead of a login/account link, with no new typecheck error from the removed `isLoggedIn` — `app/components/Header.tsx:93-101`; `isLoggedIn` is gone from `Header.tsx`, `PageLayout.tsx` and `root.tsx:167`, its only remaining use being `account.addresses.tsx:54` (its own route); `npm run typecheck` reports exactly one error, `root.tsx(208,7)` cart GraphQL mismatch, inside a region untouched by `9fc3cd03` (hunks `@@147` and `@@164` only) — pre-existing
- [x] "Être informé du lancement" lands on `/me-prevenir?offer=<slug>` — `app/components/SubscriptionOfferPage.tsx:169`
- [x] A valid submission shows a confirmation and a missing field shows an inline error with no `lead_form_submitted` — `me-prevenir.tsx:77-92` returns 400 before any fetch, `:140-149` captures only when `actionData.ok`, `:190-199` renders the confirmation; client bundle carries `fake_door_click` ×2 and `lead_form_submitted` ×1 as distinct names

### Phase 3 — SEO meta gaps

- [x] `/collections` renders a non-empty `<title>` and a `meta[name=description]` — `app/routes/collections._index.tsx` `meta` export added in `9bfff79f`
- [x] `/policies` renders a non-empty `<title>` and a `meta[name=description]` — `app/routes/policies._index.tsx` `meta` export added in `9bfff79f`
- [ ] Spec done-when #6, Open Graph half — `grep -rn "og:" app/` returns zero Open Graph tags anywhere in the storefront
- [ ] Spec done-when #6, sitemap half — `app/routes/[sitemap.xml].tsx` delegates entirely to Shopify's `getSitemapIndex`, so the new `/me-prevenir` page and every hand-written editorial route (`/abonnements`, `/qui-sommes-nous`, `/collections/all`) are absent from the sitemap

## Findings

| Sev | Kind | Phase | Location | Issue | Fix |
| --- | ---- | ----- | -------- | ----- | --- |
| 🔴 | code | 1 | `code/api/internal/routes/leads.go:61,79` | Raw `err.Error()` is returned to anonymous callers on the API's first and only unauthenticated endpoint. The DSN at `internal/db/db.go:26-33` is built from `DB_HOST`/`DB_NAME`/`DB_USERNAME`, and pgx connection failures render as `failed to connect to host=… user=… database=…`, so a DB outage publishes the RDS endpoint, DB username and database name to the public internet. The pattern was copied from `example.go:38,43`, which is behind `auth.Middleware` — the defence does not transfer to a public route. | Return a fixed message (`"Unable to store the lead"`) from both branches and log `err` server-side. |
| 🟡 | code | 1 | `code/api/internal/routes/leads.go:54` | `json.NewDecoder(req.Body).Decode` with no `http.MaxBytesReader` and no length cap on `email`, `activities`, `acquisition_channel` or `subscription_interest`, on an unauthenticated endpoint with no rate limiting (`grep -rn "RateLimit\|MaxBytes" internal/` → none), writing into unbounded `TEXT`/`TEXT[]` columns. One request can push arbitrary volume into `leads`, and a flood poisons the very metric the feature exists to produce. | Wrap the body in `http.MaxBytesReader(w, req.Body, 16<<10)` and add length/arity caps in `leadBody.valid()`. |
| 🟡 | conform | 1 | `aidd_docs/memory/api.md` ("Contracts") | Declares "All routes except `/health` and `/v1/auth/login` require `Authorization: Bearer <jwt>` via `auth.Middleware`", and its Resources list omits `/v1/leads`. Both are now contradicted by `app/app.go:25`. | Add the `/v1/leads` resource and amend the auth rule to name it as the third public route. |
| 🟡 | conform | 1 | `aidd_docs/memory/database.md` ("Main entities") | Declares "No schema exists yet: `code/database/migrations` only holds a `.gitkeep`" — contradicted by `001_create_leads.sql`, the first shipped schema. | Document the `leads` entity and its columns. |
| 🟡 | code | 2 | `code/www-shop/app/routes/me-prevenir.tsx:203` | `<Form className="me-prevenir-form">` plus six sibling `me-prevenir-*` classes are referenced but defined nowhere: `grep -rn "me-prevenir" app/styles/` returns no match. `app.css` has no bare `form` or `label` rule, so the `<label>`+`<input>`/`<select>` pairs render as inline siblings with no spacing, no vertical rhythm and no max-width. The codebase convention is one rule set per form (`.newsletter-form` `app.css:1087-1103`, `.order-search-form` `app.css:2114`). Breaks the spec hard constraint "Every new UI element uses the design system/tokens already integrated in www-shop". | Add `.me-prevenir-form { display: flex; flex-direction: column; gap: …; max-width: …; margin-inline: auto; }` and a label rule, or delete the six class names that style nothing. |
| 🟡 | fit | 2 | `code/www-shop/app/routes/me-prevenir.tsx:103-105` | `utm_source`/`utm_medium`/`utm_campaign` are read only from `/me-prevenir`'s own query string, and nothing propagates or persists the landing UTM — `grep -rn "utm_" app/` returns only these three lines plus a doc comment in `lib/search.ts`. The header CTA is `to="/me-prevenir"` (`Header.tsx:96`) and the offer CTA is `to={\`/me-prevenir?offer=…\`}` (`SubscriptionOfferPage.tsx:169`); both drop campaign params. A visitor landing on `/?utm_source=instagram` and then clicking the header stores NULL in all three columns, so spec done-when #5 holds only when campaign links point straight at `/me-prevenir`. | Persist the landing UTM (cookie or session) on first visit and submit it as hidden fields. |
| 🟡 | fit | 2 | `code/www-shop/app/routes/me-prevenir.tsx:106` | `referrer: request.headers.get('Referer')`. The `<Form method="post">` posts from the `/me-prevenir` document itself, so the browser sends that same-origin page URL as `Referer`; the column records the site's own URL, never Instagram/TikTok/Google. Combined with the UTM gap, both durable attribution columns are effectively dead and the self-reported dropdown becomes the only channel signal in the database — against the spec target "measures acquisition intent per channel". | Capture `document.referrer` client-side on landing and submit it as a hidden field. |
| 🟡 | code | 2 | `code/www-shop/app/routes/me-prevenir.tsx:110-122` | `throw new Error(<user-facing French string>)` inside `try` only to catch it one line below, and the `catch` surfaces `error.message` verbatim at `:270`. A genuine fetch failure (unset or malformed `API_BASE_URL`) yields e.g. `Failed to parse URL from undefined/v1/leads`, rendering an internal message — and potentially the API base URL — into the page. | Return the 502 `data(...)` directly instead of throwing, and use a fixed string in the `catch`. |
| 🟡 | functional | 3 | `code/www-shop/app/routes/[sitemap.xml].tsx` | Spec done-when #6 requires Open Graph tags and a sitemap/robots reflecting the current page set; phase 3 narrowed it to two `meta` exports. No `og:` tag exists anywhere, and the Shopify-driven `getSitemapIndex` omits `/me-prevenir` and every editorial route. | Add `og:title`/`og:description`/`og:type` to the shared meta shape and append the static routes to the sitemap. |
| 🟢 | code | 1 | `code/api/internal/routes/leads.go:29` | Email is stored as typed, with no lowercasing and no unique index on `email`, so one visitor submitting twice creates two rows and inflates the lead count. | Normalise to lowercase and decide on a dedup rule (unique index or an upsert). |
| 🟢 | code | 2 | `code/www-shop/app/routes/me-prevenir.tsx:202` | `action={\`${location.pathname}${location.search}\`}` is redundant — React Router's `<Form>` already defaults to the current location including its search string. | Drop the `action` prop and the `useLocation` import. |
| 🟢 | code | 2 | `code/www-shop/app/routes/me-prevenir.tsx:140-149` | `StrictMode` is enabled (`entry.client.tsx:14`), so the `lead_form_submitted` effect double-fires in development. Harmless in production, but it double-counts during local verification. | Guard with a ref, or note it when reading dev-mode PostHog data. |
| 🟢 | code | 2 | `code/www-shop/app/routes/me-prevenir.tsx:218-226` | The `activities` fieldset has no native requirement, so "at least one activity" is enforced only by a server round-trip, unlike the three other fields which fail fast. | Validate the group client-side, or document the asymmetry. |

## Verification

| Metric        | Value                                             |
| ------------- | ------------------------------------------------- |
| Verified      | 82% (9/11)                                        |
| Files checked | `code/database/migrations/001_create_leads.sql`, `code/api/internal/routes/leads.go`, `code/api/internal/app/app.go`, `code/api/internal/db/db.go`, `code/www-shop/app/lib/posthog.ts`, `code/www-shop/app/lib/context.ts`, `code/www-shop/.env.example`, `code/www-shop/app/components/Header.tsx`, `code/www-shop/app/components/PageLayout.tsx`, `code/www-shop/app/root.tsx`, `code/www-shop/app/components/SubscriptionOfferPage.tsx`, `code/www-shop/app/routes/me-prevenir.tsx`, `code/www-shop/app/routes/collections._index.tsx`, `code/www-shop/app/routes/policies._index.tsx`, `code/www-shop/app/routes/[sitemap.xml].tsx`, `code/www-shop/app/routes/[robots.txt].tsx`, `code/www-shop/app/styles/app.css`, `infrastructure/scripts/migrate.py` |
| Unchecked     | done-when #6 Open Graph half — fix; done-when #6 sitemap half — fix |
| Unplanned     | `code/www-shop/tsconfig.tsbuildinfo` churned by `9bfff79f` (a tracked build artifact, already tracked before this work and absent from any `.gitignore` — pre-existing hygiene debt, not introduced here) |

### Gates re-run independently

| Command | Result |
| --- | --- |
| `cd code/api && go vet ./...` | clean, exit 0 |
| `cd code/api && go test ./...` | pass; `internal/routes` has no test files, so `leads.go` carries no regression test (consistent with the repo, which has none for any route) |
| `cd code/www-shop && npm run lint` | 0 errors, 1 warning (`posthog.ts:1` `import/no-named-as-default`, on a line this work did not touch) |
| `cd code/www-shop && npm run typecheck` | 1 error, `root.tsx(208,7)` cart GraphQL mismatch, confirmed pre-existing and unrelated |
| `cd code/www-shop && npm run build` | success |
| `grep -rl "API_BASE_URL\|v1/leads" build/client/` | no match — server bundle only |

### Notes on criteria that could not be executed as written

- Phase 1 criterion 1 says "running `infrastructure/scripts/migrate.py` against a local database". The runner accepts only `stg|prd` (`migrate.py:11`) and requires `environments/<env>/deploy.<env>.json` with `sslmode=require`, so there is no local target; the migration artifact itself was verified statically instead.
- `npm run dev` returns 500 on every route, including untouched ones (`/`, `/qui-sommes-nous`), from `entry.server.tsx:19` reading `context.env` as undefined — a pre-existing local harness issue, not caused by this work. The local `.env` also lacks `API_BASE_URL`, which `.env.example` now declares.
