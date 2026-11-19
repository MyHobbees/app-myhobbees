CREATE TABLE box_plans (
    id                 SERIAL PRIMARY KEY,
    theme              TEXT NOT NULL CHECK (theme IN ('crochet', 'tricot', 'broderie', 'macrame')),
    level              SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
    name               TEXT NOT NULL,
    slug               TEXT NOT NULL UNIQUE,
    description        TEXT,
    price_cents        INTEGER NOT NULL CHECK (price_cents >= 0),
    stripe_product_id  TEXT NOT NULL,
    stripe_price_id    TEXT NOT NULL,
    active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (theme, level)
);
