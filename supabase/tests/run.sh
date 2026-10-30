#!/usr/bin/env bash
# Levanta un Postgres temporal, carga el esquema y corre las pruebas SQL.
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
TMP=$(mktemp -d); chmod 777 "$TMP"
PGBIN=/usr/lib/postgresql/16/bin
AS=(); [ "$(id -u)" = 0 ] && AS=(runuser -u postgres --)
"${AS[@]}" $PGBIN/initdb -D "$TMP/data" -U postgres -E UTF8 --locale=C.UTF-8 >/dev/null
"${AS[@]}" $PGBIN/pg_ctl -D "$TMP/data" -o "-k $TMP -c listen_addresses='' -c timezone=UTC" -l "$TMP/log" start >/dev/null
cleanup() { "${AS[@]}" $PGBIN/pg_ctl -D "$TMP/data" stop -m fast >/dev/null; rm -rf "$TMP"; }
trap cleanup EXIT
export PGHOST=$TMP PGUSER=postgres PGDATABASE=postgres
psql -q -v ON_ERROR_STOP=1 -f "$DIR/stub_supabase.sql"
psql -q -v ON_ERROR_STOP=1 -f "$DIR/../schema.sql"
psql -q -v ON_ERROR_STOP=1 -f "$DIR/../schema.sql"   # debe ser re-ejecutable
psql -q -v ON_ERROR_STOP=1 -f "$DIR/tests.sql"
