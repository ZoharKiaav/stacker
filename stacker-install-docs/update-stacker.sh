#!/usr/bin/env bash
set -Eeuo pipefail

# Stacker Native Platform Update Script
#
# Purpose:
#   Update the Stacker app image safely without reinstalling the whole platform.
#
# This script:
#   - backs up current Stacker database
#   - pulls the latest Stacker image
#   - recreates only the stacker app container
#   - keeps Postgres, Redis, Traefik, /etc/dokploy, and volumes intact
#   - verifies HTTP/HTTPS after update
#
# It does NOT delete volumes.
# It does NOT remove Postgres/Redis data.
# It does NOT reinstall Docker.
#
# Usage:
#   STACKER_DOMAIN=stacker.proniit.com bash stacker-install-docs/update-stacker.sh

STACKER_IMAGE="${STACKER_IMAGE:-ghcr.io/zoharkiaav/stacker/stacker:latest}"
STACKER_CONTAINER="${STACKER_CONTAINER:-stacker}"
STACKER_DOMAIN="${STACKER_DOMAIN:-stacker.proniit.com}"

ENV_FILE="${ENV_FILE:-/etc/stacker/stacker.env}"
DOKPLOY_DIR="${DOKPLOY_DIR:-/etc/dokploy}"
NETWORK_NAME="${NETWORK_NAME:-dokploy-network}"
STACKER_VOLUME="${STACKER_VOLUME:-stacker-app-data}"

BACKUP_ROOT="${BACKUP_ROOT:-/root/stacker-update-backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${STAMP}"

echo "== Stacker update =="
echo "Image:  ${STACKER_IMAGE}"
echo "Domain: ${STACKER_DOMAIN}"
echo "Backup: ${BACKUP_DIR}"
echo

if [ "$(id -u)" != "0" ]; then
  echo "ERROR: Run as root."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: env file missing: $ENV_FILE"
  exit 1
fi

if [ ! -d "$DOKPLOY_DIR" ]; then
  echo "ERROR: persistent config directory missing: $DOKPLOY_DIR"
  exit 1
fi

echo "== Loading environment =="
set -a
. "$ENV_FILE"
set +a

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_DB:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "ERROR: POSTGRES_USER, POSTGRES_DB, or POSTGRES_PASSWORD missing from env."
  exit 1
fi

echo "== Current state before update =="
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -E 'stacker|traefik|dokploy' || true

echo
echo "== Creating backup directory =="
mkdir -p "$BACKUP_DIR"

echo
echo "== Saving current container/service state =="
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" > "$BACKUP_DIR/containers-before.txt"
docker service ls > "$BACKUP_DIR/services-before.txt" 2>&1 || true
docker network ls > "$BACKUP_DIR/networks-before.txt"
docker volume ls > "$BACKUP_DIR/volumes-before.txt"

echo
echo "== Backing up env and /etc/dokploy metadata =="
cp -a /etc/stacker "$BACKUP_DIR/stacker-env"
cp -a "$DOKPLOY_DIR" "$BACKUP_DIR/dokploy-config"

echo
echo "== Backing up Stacker database =="
PG_CONTAINER="$(docker ps --filter "name=dokploy-postgres" --format '{{.Names}}' | head -n1 || true)"

if [ -z "$PG_CONTAINER" ]; then
  echo "ERROR: Could not find running dokploy-postgres task/container."
  docker service ps dokploy-postgres 2>/dev/null || true
  exit 1
fi

docker exec \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  "$PG_CONTAINER" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  > "$BACKUP_DIR/stacker-database.sql"

ls -lh "$BACKUP_DIR/stacker-database.sql"

echo
echo "== Pulling latest Stacker image =="
docker pull "$STACKER_IMAGE"

echo
echo "== Recreating Stacker app container =="
docker stop "$STACKER_CONTAINER" 2>/dev/null || true
docker rm "$STACKER_CONTAINER" 2>/dev/null || true

docker run -d \
  --name "$STACKER_CONTAINER" \
  --network "$NETWORK_NAME" \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  -v "$STACKER_VOLUME:/app/data" \
  -v "$DOKPLOY_DIR:/etc/dokploy" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  "$STACKER_IMAGE" >/dev/null

echo
echo "== Waiting for Stacker health/startup =="
sleep 25

echo
echo "== Verification: containers =="
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -E 'stacker|traefik|dokploy' || true

echo
echo "== Verification: public ports =="
ss -tulnp | grep -E ':80 |:443 |:3000 ' || true

echo
echo "== Verification: HTTP redirect =="
curl -I "http://${STACKER_DOMAIN}" || true

echo
echo "== Verification: HTTPS =="
curl -Ik "https://${STACKER_DOMAIN}" || true

echo
echo "== Recent Stacker logs =="
docker logs --tail=160 "$STACKER_CONTAINER"

echo
echo "== Recent Traefik logs =="
docker logs --tail=80 dokploy-traefik 2>/dev/null || true

echo
echo "== Update complete =="
echo "Backup saved at: ${BACKUP_DIR}"
echo "Stacker URL: https://${STACKER_DOMAIN}"