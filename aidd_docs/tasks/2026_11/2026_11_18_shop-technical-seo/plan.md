---
objective: "Every real, currently-live public page on www-shop emits a correct absolute canonical URL, Open Graph/Twitter Card tags, and relevant Schema.org JSON-LD, and the existing sitemap/robots.txt stop generating invalid locale-prefixed URLs."
status: done
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Technical SEO foundations for www-shop

## Overview

| Field      | Value                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**   | Fix the one real bug (invalid locale-prefixed sitemap URLs) and add the missing technical-SEO layer (canonical, OG/Twitter, JSON-LD) to the pages that are actually live today, without inventing content for the pre-launch catalog. |
| **Source** | Text (user request, scoped across the preceding conversation: no target keywords provided, technical SEO only) |

## Phases

| #   | Phase                                      | File                         |
| --- | ------------------------------------------- | ----------------------------- |
| 1   | Sitemap fix + shared SEO helper + root JSON-LD | [`phase-1.md`](./phase-1.md) |
| 2   | Canonical/OG/Twitter/JSON-LD on live public pages | [`phase-2.md`](./phase-2.md) |
| 3   | Search Console submission doc + memory update | [`phase-3.md`](./phase-3.md) |

## Resources

<!-- External sources only (URLs, docs), not code files. Omit if none consulted. -->

| Source                                                                 | Verified                                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `node_modules/@shopify/hydrogen/dist/production/index.d.ts` (`GetSiteMapOptions`) | `getLink` is invoked once per entry in `locales` plus once with `locale=undefined`; the app has no locale-prefixed routes, so passing any `locales` array produces URLs no real route answers |

## Decisions

<!-- Architecture-magnitude only, one you'd regret reversing. Omit if none qualify. -->

| Decision                                                                                   | Why                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical/OG URLs are built from `new URL(request.url).origin`, never `header.shop.primaryDomain.url` | `primaryDomain.url` reflects the Shopify staging store domain (`staging-aj2gg17h.myshopify.com`), not the real public domain (`myhobbees.fr`) the site is actually served from |
| No per-route migration to Hydrogen's `getSeoMeta`/`Seo` helpers across all 22 routes with existing meta | Disproportionate rewrite for a technical-SEO pass; add a small shared helper instead and apply it only to the pages that are genuinely live and indexable today |
| Remove the `locales` array from the sitemap generator entirely rather than "fixing" its values | The app's routes aren't locale-prefixed at all (confirmed via route tree) — there is no correct locale list to pass, the feature itself doesn't apply here |
