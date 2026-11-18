# SEO

## Technical SEO foundations (www-shop)

- Canonical URLs and Open Graph/Twitter meta are built from `app/lib/seo.ts` (`canonicalUrl`, `buildOpenGraphTags`, `organizationJsonLd`); canonical/OG URLs always come from `new URL(request.url).origin`, never from `header.shop.primaryDomain.url` (that field reflects the Shopify staging store domain, not the public domain the site is actually served from)
- Every live public route (`/`, `/me-prevenir`, `/qui-sommes-nous`, `/abonnements` and its three offer sub-pages, `/products/:handle`, `/collections`, `/collections/all`, `/collections/:handle`) emits a canonical `<link>` plus `og:*`/`twitter:*` tags; `/products/:handle` additionally emits `Product` JSON-LD built only from the fields `PRODUCT_QUERY` already returns (no invented catalog data)
- `root.tsx` injects one schema.org `Organization`/`WebSite` JSON-LD block (via `organizationJsonLd`) into every page's `<head>`, populated from the real `header.shop` data already fetched by the root loader
- `app/routes/sitemap.$type.$page[.xml].tsx` no longer passes a `locales` array to Hydrogen's `getSitemap` — the app has no locale-prefixed routes, so that option previously generated dead `/EN-US/...`-style URLs no route could answer; `[sitemap.xml].tsx` (the index) and `[robots.txt].tsx` were already correct and untouched

## Search Console submission (manual, human-only)

- Sitemap entry point once deployed: `https://<prod-domain>/sitemap.xml` (replace `<prod-domain>` with the real public domain, e.g. `myhobbees.fr`)
- Manual steps: Google Search Console → **Sitemaps** (left nav) → paste the exact sitemap URL above → Submit. Optionally also run **URL Inspection** on the bare domain to request indexing of the homepage.
- Indexing and ranking timelines are entirely external to this codebase — no code change here controls or guarantees when/whether Google crawls or ranks these pages.
