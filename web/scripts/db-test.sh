#!/usr/bin/env bash
# Runs the RLS / data-isolation tests against a throwaway database:
# plain Postgres + the Supabase shim + our migrations, served by PostgREST.
# Needs: a local Postgres superuser connection (PGADMIN_URL) and a postgrest binary (POSTGREST_BIN).
set -euo pipefail
cd "$(dirname "$0")/.."
: "${PGADMIN_URL:?set PGADMIN_URL, e.g. postgres://postgres@localhost:5432/postgres}"
: "${POSTGREST_BIN:?set POSTGREST_BIN to a postgrest executable}"
DB=groundwork_rls_test
JWT_SECRET="local-test-secret-local-test-secret-123456"
psql "$PGADMIN_URL" -qc "drop database if exists $DB" -c "create database $DB"
DB_URL="${PGADMIN_URL%/*}/$DB"
psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f supabase/tests/local-supabase-shim.sql
for f in supabase/migrations/*.sql; do psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
psql "$DB_URL" -q -c "grant all on all tables in schema public to service_role"
HOSTPORT=$(echo "$PGADMIN_URL" | sed -E 's#^[a-z]+://[^@]*@([^/]+)/.*#\1#')
PGRST_DB_URI="postgres://authenticator:authenticator@$HOSTPORT/$DB" \
PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon PGRST_JWT_SECRET="$JWT_SECRET" \
PGRST_SERVER_PORT=3901 PGRST_LOG_LEVEL=warn "$POSTGREST_BIN" & PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for i in $(seq 1 100); do curl -sf -o /dev/null http://localhost:3901/ && break; sleep 0.2; done
RLS_DB_URL="$DB_URL" RLS_REST_URL=http://localhost:3901 RLS_JWT_SECRET="$JWT_SECRET" \
  npx vitest run --config vitest.db.config.mts
