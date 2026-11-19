CREATE TABLE orders (
    id                         SERIAL PRIMARY KEY,
    box_plan_id                 INTEGER NOT NULL REFERENCES box_plans (id),
    subscription_id             INTEGER REFERENCES subscriptions (id),
    order_type                  TEXT NOT NULL CHECK (order_type IN ('one_off', 'subscription')),
    stripe_payment_intent_id    TEXT,
    stripe_invoice_id           TEXT,
    easypost_shipment_id        TEXT,
    tracking_code               TEXT,
    tracking_url                TEXT,
    label_url                   TEXT,
    shipped_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (order_type = 'one_off' AND subscription_id IS NULL)
        OR (order_type = 'subscription' AND subscription_id IS NOT NULL)
    )
);

CREATE INDEX orders_box_plan_id_idx ON orders (box_plan_id);
CREATE INDEX orders_subscription_id_idx ON orders (subscription_id);
