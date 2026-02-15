#!/usr/bin/env bash
set -euo pipefail

# Opens an interactive psql session into the configured app DB.
DB_NAME="${DB_NAME:-trading}"
DB_USER="${DB_USER:-${USER}}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

export PGPASSWORD="$DB_PASSWORD"
exec psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
