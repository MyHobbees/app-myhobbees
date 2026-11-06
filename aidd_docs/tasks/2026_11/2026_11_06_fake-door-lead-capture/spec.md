# Fake-door lead capture for www-shop

## Target

Replace www-shop's Shopify account/login entry point with an instrumented pre-launch lead-capture funnel — a "Me prévenir" fake-door CTA leading to a qualifying form — that measures acquisition intent per channel (Instagram, TikTok, Google SEO) via PostHog and persists every submission durably, without disrupting the existing cart purchase flow.

## Hard constraints

- The existing "Ajouter au panier" behavior and flow must not regress in any way.
- The fake-door click and the form submission are captured as two distinct, separately queryable PostHog events — a click is never counted as a submission.
- The form collects: email, "Quelles activités t'intéressent ?", "Comment nous as-tu connu ?", "Quel abonnement t'intéresse le plus ?".
- "Comment nous as-tu connu ?" includes Instagram and TikTok as first-class answer choices alongside the site's other existing acquisition channels.
- Every form submission (email, the three answers, timestamp, acquisition source) is persisted durably in the project's own Postgres database, not in Shopify's customer system.
- Every new UI element uses the design system/tokens already integrated in www-shop.
- Delivery follows the project's existing commit and quality-gate conventions (`aidd_docs/memory/vcs.md`, `coding-assertions.md`).

## Non-goals

- No real user authentication or Shopify customer-account login anywhere in this flow.
- No "Télécharger l'application" button or app-store link (www-app is not published to any store yet).
- No visual/content refresh of the "Nos boxs" catalog page — tracked separately (see the `nos-boxs-catalog-refresh` spec).
- No change to "Nos abonnements" page content or structure, beyond being referenced as context inside the new form/landing text.
- No payment, checkout, or fulfillment behavior changes.
- No migration of existing Shopify customer-account data.

## Done-when

- The header no longer shows an account/login entry point; the cart button still opens and updates the cart exactly as before.
- Clicking "Me prévenir" anywhere it appears navigates to a dedicated page with explanatory text about the box launch status and the available subscription offers, followed by the qualifying form.
- Submitting the form with a valid email and the three answers succeeds, and the submission is retrievable afterward from the project's own database.
- PostHog shows the fake-door click and the form submission as two separate, distinguishable events, each carrying enough context (e.g. the displayed price for the click; the three answers and acquisition channel for the submission) to analyze intent separately from engagement.
- A submission's recorded acquisition channel reflects the visitor's actual UTM/referrer when available, in addition to their self-reported answer.
- Every public page exposes correct per-page meta/Open Graph tags, and the site's sitemap.xml/robots.txt correctly reflect the current page set.

## Stakeholders

- Decider: Dimitri (product owner)
- Owner: engineering team maintaining `www-shop` / `code/api`
- Consumer: marketing/growth, reading PostHog and the stored leads to plan channel spend

## Context

- `www-shop` was migrated off Shopify Oxygen onto Vercel/Node — see `aidd_docs/memory/architecture.md` and `deployment.md`.
- `www-app` is not published to any app store yet — see `aidd_docs/memory/mobile.md`.
- PostHog env wiring (`PUBLIC_POSTHOG_KEY`/`PUBLIC_POSTHOG_HOST`) and the `posthog-js` dependency already exist in `www-shop`; only the instrumentation itself remains.
- `code/database/migrations` is currently empty — this is the first schema the project ships.
