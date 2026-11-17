# Review: Outils dev stg-only, seed de la DB sans Shopify

- **Verdict**: changes-requested
- **Diff**: `107de9c4...2df64121` (7 commits)
- **Axes run**: code, functional, relevancy
- **Date**: 2026_11_17
- **Findings**: 0 critical, 1 warning, 0 minor

## Phases

### Phase 1 — API : retrait du seed Shopify, seed/cleanup leads stg-only

- [x] `go build ./...` et `go vet ./...` passent sur tout `code/api`, zéro référence à `seedClient`/`SeedBase`/`SeedOrders`/`Cleanup` restante — build + vet exit 0 ; grep sur `code/` => aucune occurrence ; `internal/shopify/seed.go` supprimé (708 lignes). Routes retirées => 404 en live ; `/status` `/analytics` `/orders` `/products` `/customers` répondent comme avant (200 `connected:false` / 409 `non configuré`, comportement préexistant de `shopifyClient()`, non touché par le diff)
- [x] `POST .../v1/leads/seed?count=5` avec `APP_ENV=stg` + JWT valide répond 200 et crée les lignes `seed-*@example.test` — live : `{"created":30}` sur un run à 30, 30 lignes constatées via `GET /v1/leads` — `code/api/internal/routes/leads.go:295`
- [x] `DELETE .../v1/leads/seed` ne supprime que les lignes au motif seed, vérifié par un `COUNT` avant/après sur les vraies leads — live : `{"deleted":30}`, `seeded left: 0`, `total: 8`, lead réelle `real-review-*@myhobbees.fr` présente avant et après — `code/api/internal/routes/leads.go:374`
- [x] `go test ./internal/routes/... -run Seed` couvre succès + 403 (loc/prd) + bornes de `count` ; `go test ./...` vert — 4 tests / 8 sous-tests PASS non skippés (Postgres local joignable), `go test ./... -count=1` vert sur les 6 paquets testés — `code/api/internal/routes/leads_seed_test.go`

### Phase 2 — Back-office : détection d'environnement, page Outils dev

- [x] `initEnv()` ne lève jamais, même si l'API est injoignable — `try/catch` englobant `fetch`, `res.ok` et `res.json()`, `catch` vide laissant `env` à `null` — `code/www-back-office/src/stores/env.ts:23`
- [x] Sur stg "Outils dev" apparaît dans la sidebar, sinon absent — désormais couvert par un test dédié : `null`, `loc`, `prd` cachent le lien, `stg` l'affiche — `code/www-back-office/src/components/layout/app-layout.test.tsx:14`, filtre `code/www-back-office/src/components/layout/app-layout.tsx:154`
- [x] `npm run build`/typecheck ne signale aucune référence résiduelle à `seedBase`/`seedOrders`/`seedCleanup` — build ✓ en 327ms ; grep sur `code/` => aucune occurrence
- [ ] Scénario manuel : seeder puis nettoyer depuis la page, résultats affichés, pas de plantage — aucun outil navigateur disponible dans cet environnement ; substitué par `dev-tools.test.tsx` (6 parcours de clic sur le vrai DOM React, seul `@/lib/api` mocké, dont le reset des résultats périmés et l'état hors-stg) et par le parcours API live complet seed(30) => lead réelle intacte => cleanup => lead réelle intacte
- [x] `npm run lint`, `npm run test`, `npm run build` verts ; aucune mémoire ne mentionne plus le seed Shopify comme fonctionnalité active — lint : 4 warnings `only-export-components` préexistants dans `src/components/ui/`, zéro sur les fichiers du diff ; test : 18/18 sur 4 fichiers ; build ✓ ; `grep -rn -i "seed" aidd_docs/memory/` => plus aucune mention du seed catalogue Shopify

## Findings

| Sev | Kind | Phase | Location | Issue | Fix |
| --- | ---- | ----- | -------- | ----- | --- |
| 🟡 | rot | 2 | `aidd_docs/memory/testing.md:5` | Contradiction docs/code introduite par `7959a8f2` : la ligne affirme « **Three** frontend component-test suites exist so far, **all in `code/www-back-office/src/pages/`** », alors que le même commit en a ajouté une quatrième, hors de `src/pages/` (`src/components/layout/app-layout.test.tsx`). Les deux moitiés de la phrase sont fausses, dans une ligne que cette même livraison avait réécrite deux commits plus tôt (`ac6ca1e1`). La tâche 5 de la phase 2 fait de la tenue de la mémoire un élément du contrat, et cette mémoire est injectée dans le contexte de chaque session | Passer à « Four frontend component-test suites » et retirer le « all in `code/www-back-office/src/pages/` », en citant `app-layout.test.tsx` (garde nav `stgOnly`) avec son chemin ; la règle de localisation de `testing.md:15` (« A `www-back-office` component's test lives beside it ») couvre déjà le nouvel emplacement et n'a pas besoin de changer |

## Verification

| Metric        | Value |
| ------------- | ----- |
| Verified      | 89% (8/9) |
| Files checked | `code/api/internal/routes/leads.go`, `code/api/internal/routes/leads_seed_test.go`, `code/api/internal/routes/shopify.go`, `code/api/internal/routes/health.go`, `code/api/internal/shopify/client.go`, `code/api/internal/shopify/fulfill.go`, `code/api/internal/app/app.go`, `code/api/internal/auth/auth.go`, `code/www-back-office/src/stores/env.ts`, `code/www-back-office/src/lib/api.ts`, `code/www-back-office/src/main.tsx`, `code/www-back-office/src/pages/dev-tools.tsx`, `code/www-back-office/src/pages/dev-tools.test.tsx`, `code/www-back-office/src/components/layout/app-layout.tsx`, `code/www-back-office/src/components/layout/app-layout.test.tsx`, `code/www-back-office/src/test/setup.ts`, `code/www-back-office/src/hooks/use-mobile.ts`, `code/www-back-office/src/stores/theme.ts`, `code/www-back-office/src/router.tsx`, `code/www-back-office/src/pages/leads.tsx`, `aidd_docs/memory/api.md`, `aidd_docs/memory/deployment.md`, `aidd_docs/memory/integration.md`, `aidd_docs/memory/testing.md` |
| Unchecked     | Scénario manuel navigateur seed puis cleanup depuis la page (phase 2, critère 4) — `not-applicable` : aucun outil navigateur dans cet environnement, substitué par les 6 tests de clic `userEvent` de `dev-tools.test.tsx` et par le parcours API live |
| Unplanned     | `code/api/internal/shopify/client.go:147-160` : `userError`/`checkUserErrors` déplacés depuis le `seed.go` supprimé, hors projection d'architecture du plan — déviation justifiée et correcte, `fulfill.go` en est le seul consommateur, une seule définition dans le module, build/vet verts. `code/www-back-office/src/test/setup.ts:23-39` : polyfill `window.matchMedia` non prévu au plan — légitime et vérifié (jsdom 29.1.1 renvoie `typeof window.matchMedia === 'undefined'`, confirmé en exécutant jsdom directement ; consommateurs réels `stores/theme.ts:21` au chargement du module et `hooks/use-mobile.ts:9` au montage, tous deux atteints dès qu'un test importe `app-layout.tsx` ; garde `if (!window.matchMedia)` donc aucune implémentation réelle n'est masquée ; `matches: false` = « pas de préférence sombre » et « pas mobile », et `use-mobile.ts` ne lit de toute façon pas `matches` mais `window.innerWidth`, donc aucun bug caché ; même forme que les deux polyfills préexistants du fichier). Les 5 findings 🟢/🟡 de la revue précédente ont été corrigés dans `3effa9e6`/`ed8cd300`/`7959a8f2`/`d35d56ba` et re-vérifiés ici |
