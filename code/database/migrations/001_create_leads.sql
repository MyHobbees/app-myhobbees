CREATE TABLE leads (
    id                     SERIAL PRIMARY KEY,
    email                  TEXT NOT NULL,
    activities             TEXT[] NOT NULL DEFAULT '{}',
    acquisition_channel    TEXT NOT NULL,
    subscription_interest  TEXT NOT NULL,
    utm_source             TEXT,
    utm_medium             TEXT,
    utm_campaign           TEXT,
    referrer               TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX leads_created_at_idx ON leads (created_at);
