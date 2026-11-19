---
objective: "The 6 commerce tables (box_plans, subscription_plans, customers, subscriptions, orders, stripe_webhook_events) exist, migrated, FK-correct, and constraint-enforced, as pure SQL with no application code."
status: implemented
---

# Plan: Commerce schema (catalogue, abonnements, commandes)

## Overview

| Field      | Value                   |
| ---------- | ----------------------- |
| **Goal**   | Add Postgres tables so the API has its own source of truth for commerce data instead of Shopify's Admin API |
| **Source** | GitHub issue [#23](https://github.com/MyHobbees/app-myhobbees/issues/23) |

## Phases

| #   | Phase                          | File                         |
| --- | ------------------------------- | ---------------------------- |
| 1   | Create the 6 commerce migrations | [`phase-1.md`](./phase-1.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| `code/database/migrations/001_create_leads.sql`, `002_create_admins.sql`, `003_create_credential_shares.sql` | Real migrations directory and next free number (`004`), naming (`NNN_description.sql`), column style (`SERIAL PRIMARY KEY`, `TEXT`, `TIMESTAMPTZ NOT NULL DEFAULT NOW()`) |
| `infrastructure/scripts/migrate.py` | `ensure_app_user()` already grants `SELECT/INSERT/UPDATE/DELETE` on `ALL TABLES IN SCHEMA public` plus `ALTER DEFAULT PRIVILEGES` for future tables — no per-migration `GRANT` needed |
| `aidd_docs/memory/coding-assertions.md` | No SQL lint/test command exists; nothing under "Before commit"/"Before push" applies to a migrations-only change |
| `aidd_docs/memory/infra.md` | Migrations run against real stg/prd only through the back-office-triggered GitHub Action (stg) or the CI push pipeline (prd) — never by running `migrate.py` locally against live infra, which lacks local `TF_*` credentials anyway |

## Decisions

| Decision   | Why   |
| ---------- | ----- |
| Number the new files `004`-`009`, not the ticket's stated `002`-`007` | The ticket text predates `002_create_admins.sql` and `003_create_credential_shares.sql`, which already exist; those numbers are taken |
| No `GRANT` statement inside any new migration file | `migrate.py`'s `ensure_app_user()` grants the app role access to *all* tables in `public` globally, after every migration run; a per-file `GRANT` would be redundant and drift from the existing `001`/`002`/`003` convention (none of them has one) |
| `stripe_webhook_events.id` is `TEXT PRIMARY KEY` (the Stripe event id), not `SERIAL` | The ticket explicitly defines it as "Stripe event id, primary key" — it is an external identifier, not a sequence |
| Add a `CHECK` on `orders` tying `order_type` to `subscription_id` nullability in both directions (`one_off` ⇒ `subscription_id IS NULL`, `subscription` ⇒ `subscription_id IS NOT NULL`) | The ticket's acceptance criteria call out exactly this invariant; enforcing it in the DB prevents a future bug from inserting a `subscription`-type order with no subscription |
| Add `UNIQUE` constraints the ticket's prose implies but its column list doesn't spell out: `box_plans(theme, level)`, `box_plans.slug`, `customers.email`, `customers.stripe_customer_id`, `subscriptions.stripe_subscription_id` | The ticket itself states box plans are "each a `(theme, level)` pair" (implying one row per pair) and one row per customer per email/Stripe id; `admins.email` already follows this `UNIQUE` pattern in `002_create_admins.sql`; `subscriptions.stripe_subscription_id` is likewise an external Stripe identifier that must not collide across two local rows |
| No `ON DELETE` clause on any FK (default `NO ACTION`) | The ticket specifies no deletion/cascade behavior; guessing one (`CASCADE` vs `RESTRICT`) is not supported by the source |
| No `updated_at` auto-update trigger, despite several tables having an `updated_at` column | No trigger function exists anywhere in the repo to mirror; the ticket only asks for the column, not auto-maintenance — out of scope. Documented as an explicit obligation in `aidd_docs/memory/database.md` instead |
| Add `orders.customer_id INTEGER NOT NULL REFERENCES customers (id)`, not in the ticket's original column list | AC3/#29 needs a direct buyer FK on every order; `subscription_id` is `NULL` for `order_type = 'one_off'`, so it cannot carry that link — without `customer_id`, a one-off order's buyer is only resolvable by calling Stripe |
| EasyPost shipping address is not persisted in this schema | #31 reads the recipient address from the Stripe Checkout session at fulfillment time; the schema only stores the resulting `easypost_shipment_id`/`tracking_code`/`tracking_url`/`label_url`, not the address itself |
