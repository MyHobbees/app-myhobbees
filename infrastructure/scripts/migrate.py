import sys
import os
import re
import json
import psycopg2
from psycopg2 import sql as pgsql

# ------------------------------------------------------------ Inputs

ENVIRONMENTS = ['stg', 'prd']
MIGRATION_PATTERN = re.compile(r'^\d{3}_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$')

if len(sys.argv) != 2:
    print("Usage: migrate.py <environment>")
    exit(-1)

env = sys.argv[1]

if env not in ENVIRONMENTS:
    print(f"Invalid environment: {env}")
    exit(-1)

# ------------------------------------------------------------ Paths

home_repo = os.getcwd()
home_code = f"{home_repo}/code"
home_env = f"{home_repo}/environments/{env}"
home_migrations = f"{home_code}/database/migrations"

# ------------------------------------------------------------ Variables files

with open(f'{home_env}/deploy.{env}.json', 'r') as config_file:
    config = json.load(config_file)

try:
    import dotenv
    dotenv.load_dotenv(f"{home_env}/.env.{env}.deploy")
    print(f"Loaded .env file")
except:
    print(f"No .env file found")

# ------------------------------------------------------------ SQL

APP_USER_CREATE = "CREATE ROLE {user} WITH LOGIN PASSWORD {password};"
APP_USER_UPDATE = "ALTER ROLE {user} WITH LOGIN PASSWORD {password};"

APP_USER_GRANTS = """
GRANT CONNECT ON DATABASE {db} TO {user};
GRANT USAGE ON SCHEMA public TO {user};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {user};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {user};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {user};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {user};
"""

# ------------------------------------------------------------ Methods

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=config['DB_HOST'],
            port=config['DB_PORT'],
            dbname=f"{config['APP_NAME'].replace('-', '_')}_{env}",
            user=os.getenv(f"TF_{env.upper()}__DB_USERNAME"),
            password=os.getenv(f"TF_{env.upper()}__DB_PASSWORD")
        )
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        exit(-1)


def ensure_migrations_table(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS _migrations (
            id         SERIAL PRIMARY KEY,
            filename   VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMP DEFAULT NOW()
        )
    """)


def get_applied_migrations(cursor):
    cursor.execute("SELECT filename FROM _migrations")
    return {row[0] for row in cursor.fetchall()}


def validate_migration_filenames(files):
    invalid = [f for f in files if not MIGRATION_PATTERN.match(f)]
    if invalid:
        print("Invalid migration filenames (expected: NNN_description.sql, e.g. 001_initial.sql):")
        for filename in invalid:
            print(f"  - {filename}")
        exit(-1)

    numbers = [f[:3] for f in files]
    duplicates = sorted({n for n in numbers if numbers.count(n) > 1})
    if duplicates:
        print(f"Duplicate migration numbers: {', '.join(duplicates)}")
        exit(-1)


def apply_migration(cursor, filename):
    try:
        with open(os.path.join(home_migrations, filename), 'r') as f:
            sql = f.read()

        cursor.execute(sql)
        cursor.execute("INSERT INTO _migrations (filename) VALUES (%s)", (filename,))
        print(f"Migration applied: {filename}")
    except Exception as e:
        print(f"Error applying migration {filename}: {e}")
        exit(-1)


def ensure_app_user(cursor):
    app_user = f"{config['APP_NAME'].replace('-', '_')}_app"
    app_password = os.getenv(f"TF_{env.upper()}__DB_APP_PASSWORD")
    db_name = f"{config['APP_NAME'].replace('-', '_')}_{env}"

    if not app_password:
        print("No TF_*__DB_APP_PASSWORD set, skipping app user provisioning")
        return

    cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (app_user,))
    role_sql = APP_USER_UPDATE if cursor.fetchone() else APP_USER_CREATE

    cursor.execute(pgsql.SQL(role_sql + APP_USER_GRANTS).format(
        user=pgsql.Identifier(app_user),
        password=pgsql.Literal(app_password),
        db=pgsql.Identifier(db_name),
    ))
    print(f"App user provisioned: {app_user}")


def run_migrations():
    conn = get_db_connection()
    cursor = conn.cursor()

    ensure_migrations_table(cursor)
    applied = get_applied_migrations(cursor)

    files = sorted([f for f in os.listdir(home_migrations) if f.endswith('.sql')])

    validate_migration_filenames(files)

    if not files:
        print("No migration files found")
        return

    for filename in files:
        if filename in applied:
            print(f"Skipping {filename} (already applied)")
            continue
        apply_migration(cursor, filename)

    ensure_app_user(cursor)

    cursor.close()
    conn.close()

# ------------------------------------------------------------ Script

run_migrations()
