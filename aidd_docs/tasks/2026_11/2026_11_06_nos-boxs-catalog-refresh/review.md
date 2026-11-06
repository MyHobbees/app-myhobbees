# Review: Nos boxs catalog refresh

- **Verdict**: approve
- **Diff**: `d910fee3, 06b6be2c, 65f1b2d5`
- **Axes run**: code, functional, relevancy
- **Date**: 2026_11_06
- **Findings**: 0 critical, 0 warning, 4 minor

## Phases

### Phase 1 — Local box data and SVG illustrations

- [x] `BOXES.crochet`, `BOXES.couture`, `BOXES.peinture` each exist and type-check against `Box` — `app/lib/boxes.ts:10-47`, typed `Record<BoxSlug, Box>`; `npm run typecheck` reports no error in `boxes.ts`
- [x] Each craft renders a visibly different SVG, and `prefers-reduced-motion: reduce` leaves no running animation — `app/components/BoxIllustration.tsx:26-28` selects one of three distinct motif components (`:34-59` yarn, `:61-85` dashed seam, `:87-111` brush + swatches); `app/styles/app.css:838-844` sets `animation: none` for all three animated hooks inside `@media (prefers-reduced-motion: reduce)`. Confirmed by a direct SSR render: three distinct `box-illustration--<craft>` wrappers, three distinct motif classes (`-yarn`, `-seam`, `-brush`) and three distinct `aria-label`s

### Phase 2 — Rewire "Nos boxs" off Shopify

- [x] `collections.all.tsx` has no `storefront`, `CATALOG_QUERY` or Hydrogen pagination import, and `npm run build` succeeds — `app/routes/collections.all.tsx:1-6` imports only route types, `lucide-react`, `BoxIllustration`, `EditorialHero`, `FaqSection` and `BOXES`; no `loader`/`loadCriticalData`/`loadDeferredData` remains; the emitted client chunk `build/client/assets/collections.all-YZKzdAEi.js` (4.8 kB) contains no `CATALOG_QUERY`, `storefront.query` or `PaginatedResourceSection`; build green
- [x] `/collections/all` shows exactly 3 cards, in the order crochet, couture, peinture, each with a distinct illustration, title and tagline — `collections.all.tsx:19` fixes the order, `:33-57` renders one card per entry. Verified by rendering the route component through `react-dom/server`: exactly 3 `class="product-item"` cards, one occurrence each of "Box Crochet"/"Box Couture"/"Box Peinture", three distinct illustration wrappers, and zero Shopify artifacts (`/products/`, `ProductItem`, `variant=`) in the output

## Findings

| Sev | Kind | Phase | Location | Issue | Fix |
| --- | ---- | ----- | -------- | ----- | --- |
| 🟢 | code | 1 | `code/www-shop/app/components/BoxIllustration.tsx:26-28` | Three sequential `craft === '…' ? <X /> : null` ternaries sit beside a `Record<BoxSlug, string>` lookup used for `LABELS` at `:7-11`. The two halves of the same dispatch use different shapes, and adding a craft means editing three lines rather than one map entry. | Replace the ternary chain with a `Record<BoxSlug, () => ReactElement>` mirroring `LABELS`. |
| 🟢 | rot | 1 | `code/www-shop/app/lib/boxes.ts:10-47` | Each entry repeats its map key as a `slug` field, so the two can drift. Consistent with `subscriptionOffers.ts`, which the plan deliberately mirrors, so noted as a latent risk only. | Derive `slug` from the key, or keep as-is for parity with the existing pattern. |
| 🟢 | code | 2 | `code/www-shop/app/routes/collections.all.tsx:19` | `BOXES_ORDER` restates the literal insertion order of `BOXES`, giving a second place to edit when a box is added. The plan does ask for an explicit fixed order, so this is defensible. | Derive from a single exported order array in `boxes.ts`, or keep the explicit contract. |
| 🟢 | rot | 2 | `code/www-shop/app/routes/collections.all.tsx` | The page is now fully local but keeps the Shopify-shaped URL `/collections/all` and the `product-item`/`products-grid` class family, while `[sitemap.xml].tsx` still emits a Shopify-driven `collections` sitemap. Nothing breaks and the plan explicitly decided to keep the URL; recorded as a naming-versus-reality note. | None required; revisit if the route ever moves to `/boxs`. |

## Verification

| Metric        | Value                                             |
| ------------- | ------------------------------------------------- |
| Verified      | 100% (4/4)                                        |
| Files checked | `code/www-shop/app/lib/boxes.ts`, `code/www-shop/app/components/BoxIllustration.tsx`, `code/www-shop/app/styles/app.css`, `code/www-shop/app/routes/collections.all.tsx` |
| Unchecked     | none                                              |
| Unplanned     | none                                              |

### Gates re-run independently

| Command | Result |
| --- | --- |
| `cd code/www-shop && npm run lint` | 0 errors, 1 warning in `posthog.ts` (unrelated to this feature) |
| `cd code/www-shop && npm run typecheck` | 1 error, `root.tsx(208,7)`, pre-existing and unrelated |
| `cd code/www-shop && npm run build` | success |
| SSR render of `collections.all` default export | 3 cards, 3 titles, 3 distinct illustrations, 0 Shopify artifacts |

### Scope and regression checks

- Design tokens: `BoxIllustration` uses `var(--color-yellow|blue|pink|green|brown)`, all defined in `app/styles/app.css:7-12` — conforms to `aidd_docs/memory/design.md` ("plain `:root` CSS custom properties").
- Reused classes all exist in `app.css`: `editorial-page`, `boxes-page-grid`, `products-grid`, `product-item`, `product-item-media`, `product-item-content`, `subscription-feature-list`. No undefined class was introduced by this feature.
- No orphaned component: `ProductItem` still has consumers in `abonnements.tsx` and `collections.$handle.tsx`; `PaginatedResourceSection` still has five. Dropping them from `collections.all.tsx` left no dead code.
- "Nos abonnements" untouched: no feature commit touches `app/routes/abonnements*` or `app/lib/subscriptionOffers.ts`.
- Accessibility: the illustration wrapper carries `role="img"` with a per-craft `aria-label` and the inner `<svg>` is `aria-hidden` — correct for `eslint-plugin-jsx-a11y`, which reports no error.
