#!/usr/bin/env bash
set -Eeuo pipefail

# Stacker Backup / Restore Script
#
# Backup:
#   bash stacker-install-docs/backup-restore-stacker.sh backup
#
# Restore:
#   RESTORE_FILE=/root/stacker-backups/YYYYMMDD-HHMMSS/stacker-database.sql \
#   bash stacker-install-docs/backup-restore-stacker.sh restore
#
# This script backs up:
#   - Stacker PostgreSQL database
#   - /etc/stacker
#   - /etc/dokploy
#
# It does NOT delete Docker volumes.

ACTION="${1:-backup}"

ENV_FILE="${ENV_FILE:-/etc/stacker/stacker.env}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/stacker-backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${STAMP}"

if [ "$(id -u)" != "0" ]; then
  echo "ERROR: Run as root."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Missing env file: $ENV_FILE"
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_DB:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "ERROR: POSTGRES_USER, POSTGRES_DB, or POSTGRES_PASSWORD missing."
  exit 1
fi

find_pg_container() {
  docker ps --filter "name=dokploy-postgres" --format '{{.Names}}' | head -n1 || true
}

backup_stacker() {
  mkdir -p "$BACKUP_DIR"

  echo "== Backup directory =="
  echo "$BACKUP_DIR"

  echo
  echo "== Finding Postgres container =="
  PG_CONTAINER="$(find_pg_container)"

  if [ -z "$PG_CONTAINER" ]; then
    echo "ERROR: Could not find running dokploy-postgres container/task."
    docker service ps dokploy-postgres 2>/dev/null || true
    exit 1
  fi

  echo "Postgres container: $PG_CONTAINER"

  echo
  echo "== Backing up Stacker database =="
  docker exec \
    -e PGPASSWORD="$POSTGRES_PASSWORD" \
    "$PG_CONTAINER" \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    > "$BACKUP_DIR/stacker-database.sql"

  echo
  echo "== Backing up config directories =="
  cp -a /etc/stacker "$BACKUP_DIR/stacker-env"
  cp -a /etc/dokploy "$BACKUP_DIR/dokploy-config"

  echo
  echo "== Saving runtime state =="
  docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" > "$BACKUP_DIR/containers.txt"
  docker service ls > "$BACKUP_DIR/services.txt" 2>&1 || true
  docker network ls > "$BACKUP_DIR/networks.txt"
  docker volume ls > "$BACKUP_DIR/volumes.txt"

  echo
  echo "== Backup complete =="
  ls -lah "$BACKUP_DIR"
}

restore_stacker() {
  if [ -z "${RESTORE_FILE:-}" ]; then
    echo "ERROR: RESTORE_FILE is required for restore."
    echo "Example:"
    echo "RESTORE_FILE=/root/stacker-backups/20260716-120000/stacker-database.sql bash stacker-install-docs/backup-restore-stacker.sh restore"
    exit 1
  fi

  if [ ! -f "$RESTORE_FILE" ]; then
    echo "ERROR: Restore file not found: $RESTORE_FILE"
    exit 1
  fi

  echo "== Restore file =="
  echo "$RESTORE_FILE"

  echo
  echo "== Finding Postgres container =="
  PG_CONTAINER="$(find_pg_container)"

  if [ -z "$PG_CONTAINER" ]; then
    echo "ERROR: Could not find running dokploy-postgres container/task."
    docker service ps dokploy-postgres 2>/dev/null || true
    exit 1
  fi

  echo "Postgres container: $PG_CONTAINER"

  echo
  echo "== Creating pre-restore backup =="
  backup_stacker

  echo
  echo "== Restoring database =="
  cat "$RESTORE_FILE" | docker exec \
    -i \
    -e PGPASSWORD="$POSTGRES_PASSWORD" \
    "$PG_CONTAINER" \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

  echo
  echo "== Restarting Stacker =="
  docker restart stacker

  echo
  echo "== Restore complete =="
  sleep 10
  docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -E 'stacker|traefik|dokploy' || true
}

case "$ACTION" in
  backup)
    backup_stacker
    ;;
  restore)
    restore_stacker
    ;;
  *)
    echo "ERROR: Unknown action: $ACTION"
    echo "Use:"
    echo "  backup"
    echo "  restore"
    exit 1
    ;;
esac