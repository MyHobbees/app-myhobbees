CREATE TABLE customers (
    id                  SERIAL PRIMARY KEY,
    email               TEXT NOT NULL UNIQUE,
    stripe_customer_id  TEXT NOT NULL UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
