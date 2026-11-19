CREATE TABLE subscription_plans (
    id                 SERIAL PRIMARY KEY,
    name               TEXT NOT NULL,
    frequency          TEXT NOT NULL CHECK (frequency IN ('monthly')),
    price_cents        INTEGER NOT NULL,
    stripe_product_id  TEXT NOT NULL,
    stripe_price_id    TEXT NOT NULL,
    active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
