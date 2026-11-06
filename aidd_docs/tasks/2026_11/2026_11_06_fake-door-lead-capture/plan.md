---
objective: "www-shop's header sends every visitor through an instrumented 'Me prévenir' lead-capture form instead of Shopify login, and every submission is durably stored via the Go API."
status: implemented
---

# Plan: Fake-door lead capture for www-shop

## Overview

| Field      | Value                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| **Goal**   | Replace the account/login entry point with an instrumented "Me prévenir" fake-door funnel, backed by a new Go API endpoint and Postgres table |
| **Source** | [`spec.md`](./spec.md)                                                 |

## Phases

| #   | Phase                               | File                          |
| --- | ------------------------------------ | ----------------------------- |
| 1   | Leads storage (migration + Go API)   | [`phase-1.md`](./phase-1.md)  |
| 2   | Fake-door UI, form, and PostHog events | [`phase-2.md`](./phase-2.md)  |
| 3   | SEO meta gaps                        | [`phase-3.md`](./phase-3.md)  |

## Decisions

| Decision | Why |
| --- | --- |
| The form posts through a React Router server `action` in `www-shop`, which calls a new public (unauthenticated) `POST /v1/leads` on the Go API — not a direct Postgres connection from `www-shop` | Spec explicitly asks for the Go API + a migration to own this data; keeps the DB credential server-side-only in `code/api`, matching the existing architecture (`www-back-office` also only ever talks to Postgres through `code/api`) |
| `api/internal/routes/leads.go` is mounted under `/v1` with no `auth.Middleware`, unlike `/v1/shopify` | It is a public marketing capture endpoint hit by anonymous storefront visitors, not an admin action |
| The existing subscription-offer "Être informé du lancement" links (currently `/pages/contact`) are repointed at `/me-prevenir?offer=<slug>`, reusing the fake-door flow instead of adding a second one | `SubscriptionOfferPage`'s `OfferCta` already renders this exact "not purchasable yet" fallback for all three offers today (`future.sellingPlanId` is `null` for all of them) — it is the same fake door the header needs, just not instrumented yet |
| "Télécharger l'application" button is not added (confirmed in spec non-goals) | `www-app` has no store listing to link to (`aidd_docs/memory/mobile.md`) |
