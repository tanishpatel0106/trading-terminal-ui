#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/db_setup.sh
# Optional env vars:
#   DB_NAME (default: trading)
#   DB_USER (default: postgres)
#   DB_PASSWORD (default: postgres)
#   DB_HOST (default: localhost)
#   DB_PORT (default: 5432)

DB_NAME="${DB_NAME:-trading}"
DB_USER="${DB_USER:-${USER}}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

export PGPASSWORD="$DB_PASSWORD"

echo "[1/3] Checking PostgreSQL connectivity..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c 'SELECT 1;' >/dev/null

echo "[2/3] Creating database if missing: $DB_NAME"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<SQL
SELECT 'CREATE DATABASE ${DB_NAME}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
SQL

echo "[3/3] Running Alembic migrations..."
export DATABASE_URL="postgresql+psycopg://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

(cd "$PROJECT_ROOT" && alembic -c alembic.ini upgrade head)

echo "Done. Database is ready: $DB_NAME"
