CREATE TABLE subscriptions (
    id                       SERIAL PRIMARY KEY,
    customer_id              INTEGER NOT NULL REFERENCES customers (id),
    subscription_plan_id     INTEGER NOT NULL REFERENCES subscription_plans (id),
    stripe_subscription_id   TEXT NOT NULL UNIQUE,
    status                   TEXT NOT NULL,
    theme                    TEXT CHECK (theme IS NULL OR theme IN ('crochet', 'tricot', 'broderie', 'macrame')),
    current_level            SMALLINT NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 3),
    current_period_end       TIMESTAMPTZ NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX subscriptions_customer_id_idx ON subscriptions (customer_id);
