# Database

## Setup

- Postgres (`postgres18`), accessed from the API via a `pgxpool` pool (`code/api/internal/db/db.go`), configured by `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD`/`DB_SSLMODE` env vars (`sslmode=require` by default)
- Local dev runs Postgres through `docker-compose.yml`'s `postgres` service

## Main entities

No schema exists yet: `code/database/migrations` only holds a `.gitkeep`.

## Conventions

- Migrations are plain SQL files named `NNN_description.sql`, validated and applied by `infrastructure/scripts/migrate.py <stg|prd>`, which tracks what ran in a `_migrations` table it creates
- The migration run connects as the privileged Terraform-managed user, then grants a separate, narrower app role (the one the API's `DB_USERNAME` targets) `SELECT/INSERT/UPDATE/DELETE` on all tables — migrations and runtime access are deliberately different roles
- CI runs migrations per environment (`migrate-database-stg`/`-prd`) right after that environment's database Terraform step
