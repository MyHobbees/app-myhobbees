# SEO

## Technical SEO foundations (www-shop)

- Canonical URLs and Open Graph/Twitter meta are built from `app/lib/seo.ts` (`canonicalUrl`, `buildOpenGraphTags`, `organizationJsonLd`); canonical/OG URLs never come from `header.shop.primaryDomain.url` (that field reflects the Shopify staging store domain, not the public domain the site is actually served from) — see below for where they do come from
- `canonicalUrl()` pins its origin to `process.env.PUBLIC_SITE_URL` when that env var is set (falling back to the request's own origin otherwise, so local dev needs no config); production on Vercel must have it set to `https://www.myhobbees.fr` in the project's environment variables so a crawler reaching the site via the `*.vercel.app` alias doesn't get that host self-endorsed as canonical
- Every live public route (`/`, `/me-prevenir`, `/qui-sommes-nous`, `/abonnements` and its three offer sub-pages, `/products/:handle`, `/collections`, `/collections/all`, `/collections/:handle`) emits a canonical `<link>` plus `og:*`/`twitter:*` tags; `/products/:handle` additionally emits `Product` JSON-LD built only from the fields `PRODUCT_QUERY` already returns (no invented catalog data)
- `root.tsx` injects one schema.org `Organization`/`WebSite` JSON-LD block (via `organizationJsonLd`) into every page's `<head>`, populated from the real `header.shop` data already fetched by the root loader
- `app/routes/sitemap.$type.$page[.xml].tsx` no longer passes a `locales` array to Hydrogen's `getSitemap` — the app has no locale-prefixed routes, so that option previously generated dead `/EN-US/...`-style URLs no route could answer; `[sitemap.xml].tsx` (the index) and `[robots.txt].tsx` were already correct and untouched

## Search Console submission (manual, human-only)

- Sitemap entry point once deployed: `https://www.myhobbees.fr/sitemap.xml`. Canonical host is `www.myhobbees.fr` — confirmed via the Vercel domain configuration: `www.myhobbees.fr` is the Production domain with a valid certificate, and the apex `myhobbees.fr` is set up as a 308 redirect to it (not a separate serving host). `shop.myhobbees.com` is unrelated: an unused `shop_endpoint` Terraform variable in `environments/prd/variables.prd.tf` and `environments/stg/variables.stg.tf`, never referenced by any CORS/CloudFront/Lambda config, no DNS record for it exists — ignore it for Search Console purposes. Submit the `www.myhobbees.fr` property in GSC; if the apex redirect is ever changed to serve content directly instead of redirecting, add `myhobbees.fr` as a second property then.
- Manual steps: Google Search Console → **Sitemaps** (left nav) → paste the exact sitemap URL (with the confirmed domain) → Submit. Optionally also run **URL Inspection** on the bare domain to request indexing of the homepage.
- Indexing and ranking timelines are entirely external to this codebase — no code change here controls or guarantees when/whether Google crawls or ranks these pages.
