# Database

## Setup

- Postgres (`postgres18`), accessed from the API via a `pgxpool` pool (`code/api/internal/db/db.go`), configured by `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD`/`DB_SSLMODE` env vars (`sslmode=require` by default)
- Local dev runs Postgres through `docker-compose.yml`'s `postgres` service

## Main entities

- `leads` (`001_create_leads.sql`): one row per `www-shop` "Me prévenir" pre-launch form submission — email, the three answers (`activities` as a text array, `acquisition_channel`, `subscription_interest`), optional `utm_source`/`utm_medium`/`utm_campaign`/`referrer`, `created_at`. Written only by the public `POST /v1/leads` API route.
- `admins` (`002_create_admins.sql`): one row per back-office admin — unique `email`, bcrypt `password_hash`, `is_super_admin`, `created_at`. Bootstrapped and managed through `/v1/auth/login` and `/v1/admins` — see [auth.md](auth.md).
- `box_plans` (`004_create_box_plans.sql`): one-off catalogue of fixed `(theme, level)` pairs, each with its own Stripe product/price and `price_cents`; `UNIQUE (theme, level)` and `UNIQUE slug` enforce one row per pair.
- `subscription_plans` (`005_create_subscription_plans.sql`): the recurring offer(s), modeled as a table rather than a hardcoded value; `frequency` is currently constrained to `monthly`.
- `customers` (`006_create_customers.sql`): one row per paying customer, keyed by unique `email` and unique `stripe_customer_id`.
- `subscriptions` (`007_create_subscriptions.sql`): a customer's active subscription and current progress; `theme IS NULL` means découverte (no fixed theme), otherwise `theme` is one of the four catalogue themes; `current_level` is DB-bounded to 1-3 but monotonic increase is enforced by application logic (#29), not the schema.
- `orders` (`008_create_orders.sql`): one row per shipment, from a one-off purchase or a subscription cycle. `customer_id` is always set (direct buyer FK); `subscription_id` is required when `order_type = 'subscription'` and forced `NULL` when `order_type = 'one_off'` (enforced by `CHECK`); `stripe_payment_intent_id`/`stripe_invoice_id` are each `UNIQUE` (nullable) to reject duplicate fulfillment.
- `stripe_webhook_events` (`009_create_stripe_webhook_events.sql`): dedupe table for the Stripe webhook endpoint (#29) — `id` is the Stripe event id itself (`TEXT PRIMARY KEY`), so a replayed event fails on insert.

`box_plans`, `subscription_plans`, and `subscriptions` have an `updated_at` column with no auto-update trigger — any future `UPDATE` to these tables must set `updated_at = NOW()` explicitly.

## Conventions

- Migrations are plain SQL files named `NNN_description.sql`, validated and applied by `infrastructure/scripts/migrate.py <stg|prd>`, which tracks what ran in a `_migrations` table it creates
- The migration run connects as the privileged Terraform-managed user, then grants a separate, narrower app role (the one the API's `DB_USERNAME` targets) `SELECT/INSERT/UPDATE/DELETE` on all tables — migrations and runtime access are deliberately different roles
- For prd, CI still runs migrations in the push pipeline (`migrate-database-prd`) right after the database Terraform step. For stg, that push-triggered job is gone — migrations instead run on demand, dispatched from the back-office right after it starts the (normally stopped) stg instance — see [infra.md](infra.md)'s "Staging DB control exception" and [deployment.md](deployment.md)
