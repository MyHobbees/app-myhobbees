---
status: done
---

# Instruction: Create the 6 commerce migrations

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
.
└── code/database/migrations/
    ├── 004_create_box_plans.sql              ✅ create
    ├── 005_create_subscription_plans.sql     ✅ create
    ├── 006_create_customers.sql              ✅ create
    ├── 007_create_subscriptions.sql          ✅ create
    ├── 008_create_orders.sql                 ✅ create
    └── 009_create_stripe_webhook_events.sql  ✅ create
```

## User Journey

```mermaid
flowchart TD
  A[migrate.py applies 004..009 in order] --> B[box_plans + subscription_plans + customers created]
  B --> C[subscriptions created, FK customers + subscription_plans]
  C --> D[orders created, FK box_plans + subscriptions]
  D --> E[stripe_webhook_events created]
  E --> F[app role already has CRUD via ensure_app_user]
```

## Test Scope

<!-- No UI, no API: the channel is cli (local docker-compose Postgres + psql), per aidd_docs/memory/infra.md real stg/prd migrations never run from this machine. -->

```mermaid
---
title: Test scope
---
journey
  section Setup
    Start local postgres via docker-compose => myhobbees_loc reachable on 5432: 5: cli
    Apply 001..003 then 004..009 in order with psql => all 9 files run without error: 5: cli
  section Happy path
    Insert one box_plans row per (theme, level) seed candidate => insert succeeds: 5: cli
    Insert a subscription_plans row (frequency=monthly) => insert succeeds: 5: cli
    Insert a customers row, then a subscriptions row FK'd to it => insert succeeds: 5: cli
    Insert an orders row with order_type=one_off, box_plan_id set, subscription_id NULL => insert succeeds: 5: cli
    Insert an orders row with order_type=subscription, box_plan_id set, subscription_id set => insert succeeds: 5: cli
    Join orders -> box_plans -> subscriptions -> customers => all FKs resolve: 5: cli
    Insert a stripe_webhook_events row keyed by a Stripe event id, then re-insert the same id => second insert violates the PK (dedupe works): 5: cli
  section Edge case - invalid theme
    Insert box_plans with theme='origami' => trigger insert => CHECK violation rejects the row: 1: cli
  section Edge case - invalid level
    Insert box_plans with level=4 => trigger insert => CHECK violation rejects the row: 1: cli
  section Edge case - order_type/subscription_id mismatch
    Insert orders with order_type=one_off and subscription_id set => trigger insert => CHECK violation rejects the row: 1: cli
    Insert orders with order_type=subscription and subscription_id NULL => trigger insert => CHECK violation rejects the row: 1: cli
  section Teardown
    Drop the myhobbees_loc test data => docker-compose down -v: 5: cli
```

## Tasks to do

### `1)` `004_create_box_plans.sql`

> Unit-purchase catalogue: fixed `(theme, level)` pairs, each with a one-time Stripe price.

1. `CREATE TABLE box_plans` with `id SERIAL PRIMARY KEY`, `theme TEXT NOT NULL CHECK (theme IN ('crochet','tricot','broderie','macrame'))`, `level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3)`, `name TEXT NOT NULL`, `slug TEXT NOT NULL UNIQUE`, `description TEXT`, `price_cents INTEGER NOT NULL`, `stripe_product_id TEXT NOT NULL`, `stripe_price_id TEXT NOT NULL`, `active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
2. Add `UNIQUE (theme, level)` — one catalogue row per pair.

### `2)` `005_create_subscription_plans.sql`

> The single recurring offer, modeled as a table (not a hardcoded value) in case a second tier/frequency is added.

1. `CREATE TABLE subscription_plans` with `id SERIAL PRIMARY KEY`, `name TEXT NOT NULL`, `frequency TEXT NOT NULL CHECK (frequency IN ('monthly'))`, `price_cents INTEGER NOT NULL`, `stripe_product_id TEXT NOT NULL`, `stripe_price_id TEXT NOT NULL`, `active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.

### `3)` `006_create_customers.sql`

> One row per paying customer.

1. `CREATE TABLE customers` with `id SERIAL PRIMARY KEY`, `email TEXT NOT NULL UNIQUE`, `stripe_customer_id TEXT NOT NULL UNIQUE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.

### `4)` `007_create_subscriptions.sql`

> A subscriber's chosen mode (theme or découverte) and current progress — not FK'd to one fixed box, since which box ships varies monthly.

1. `CREATE TABLE subscriptions` with `id SERIAL PRIMARY KEY`, `customer_id INTEGER NOT NULL REFERENCES customers (id)`, `subscription_plan_id INTEGER NOT NULL REFERENCES subscription_plans (id)`, `stripe_subscription_id TEXT NOT NULL UNIQUE`, `status TEXT NOT NULL`, `theme TEXT CHECK (theme IS NULL OR theme IN ('crochet','tricot','broderie','macrame'))`, `current_level SMALLINT NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 3)`, `current_period_end TIMESTAMPTZ NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
2. Add `CREATE INDEX subscriptions_customer_id_idx ON subscriptions (customer_id)`.

### `5)` `008_create_orders.sql`

> One row per shipment, from a one-off purchase or a subscription cycle.

1. `CREATE TABLE orders` with `id SERIAL PRIMARY KEY`, `box_plan_id INTEGER NOT NULL REFERENCES box_plans (id)`, `subscription_id INTEGER REFERENCES subscriptions (id)`, `order_type TEXT NOT NULL CHECK (order_type IN ('one_off','subscription'))`, `stripe_payment_intent_id TEXT`, `stripe_invoice_id TEXT`, `easypost_shipment_id TEXT`, `tracking_code TEXT`, `tracking_url TEXT`, `label_url TEXT`, `shipped_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
2. Add `CHECK ((order_type = 'one_off' AND subscription_id IS NULL) OR (order_type = 'subscription' AND subscription_id IS NOT NULL))`.
3. Add `CREATE INDEX orders_box_plan_id_idx ON orders (box_plan_id)` and `CREATE INDEX orders_subscription_id_idx ON orders (subscription_id)`.

### `6)` `009_create_stripe_webhook_events.sql`

> Dedupe table for the webhook endpoint (ticket #29).

1. `CREATE TABLE stripe_webhook_events` with `id TEXT PRIMARY KEY`, `type TEXT NOT NULL`, `processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.

### `7)` Validate locally

> No `migrate.py` run against real stg/prd (no local `TF_*` credentials, and per `infra.md` those only run through the back-office trigger / CI pipeline).

1. `docker-compose up -d postgres`.
2. Apply `001`..`009` in order with `psql` against `myhobbees_loc`.
3. Run the inserts and joins from the Test Scope's happy path and edge cases above.
4. `docker-compose down -v`.

## Test acceptance criteria

| Task | Acceptance criteria              |
| ---- | -------------------------------- |
| 1 | `box_plans` rejects an unknown `theme`, a `level` outside 1-3, or a duplicate `(theme, level)` pair; accepts one row per valid pair |
| 2 | `subscription_plans` accepts a `monthly` row; rejects any other `frequency` |
| 3 | `customers` rejects a duplicate `email` or `stripe_customer_id` |
| 4 | `subscriptions` accepts `theme IS NULL` (découverte) or a valid theme; rejects `current_level` outside 1-3; FK to `customers`/`subscription_plans` enforced |
| 5 | `orders` rejects `order_type='one_off'` with a non-null `subscription_id`, and `order_type='subscription'` with a null `subscription_id`; FK to `box_plans` (required) and `subscriptions` (optional) enforced |
| 6 | `stripe_webhook_events` rejects a second insert with the same `id` (dedupe) |
| 7 | All 9 migration files apply cleanly in order against a fresh local Postgres; every insert/rejection above is observed |
