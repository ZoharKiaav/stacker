#!/usr/bin/env bash
set -Eeuo pipefail

# Stacker Native Platform Installer
#
# Purpose:
#   Install/run Stacker in the Dokploy-style platform shape:
#   - Docker Swarm active
#   - dokploy-network overlay network
#   - dokploy-postgres as Swarm service
#   - dokploy-redis as Swarm service
#   - stacker app container internal on 3000
#   - dokploy-traefik public on 80/443
#   - /etc/dokploy persisted on host
#   - /etc/stacker/stacker.env persisted on host
#
# Usage:
#   PUBLIC_IP=46.224.208.167 STACKER_DOMAIN=stacker.proniit.com ACME_EMAIL=support@proniit.com bash stacker-install-docs/install-stacker.sh

STACKER_IMAGE="${STACKER_IMAGE:-ghcr.io/zoharkiaav/stacker/stacker:latest}"
STACKER_DOMAIN="${STACKER_DOMAIN:-stacker.proniit.com}"
PUBLIC_IP="${PUBLIC_IP:-}"
ACME_EMAIL="${ACME_EMAIL:-support@proniit.com}"

ENV_DIR="/etc/stacker"
ENV_FILE="/etc/stacker/stacker.env"

DOKPLOY_DIR="/etc/dokploy"
TRAEFIK_DIR="/etc/dokploy/traefik"
TRAEFIK_DYNAMIC_DIR="/etc/dokploy/traefik/dynamic"

NETWORK_NAME="dokploy-network"

POSTGRES_SERVICE="dokploy-postgres"
REDIS_SERVICE="dokploy-redis"

POSTGRES_VOLUME="stacker-postgres-data"
REDIS_VOLUME="stacker-redis-data"
STACKER_VOLUME="stacker-app-data"

STACKER_CONTAINER="stacker"
TRAEFIK_CONTAINER="dokploy-traefik"

echo "== Stacker Native Platform Installer =="
echo "Image:        $STACKER_IMAGE"
echo "Domain:       $STACKER_DOMAIN"
echo "Public IP:    ${PUBLIC_IP:-not supplied}"
echo "ACME email:   $ACME_EMAIL"
echo

if [ "$(id -u)" != "0" ]; then
  echo "ERROR: Run as root."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed. Run the Ubuntu 24.04 Docker host prep scripts first."
  exit 1
fi

echo "== Docker version =="
docker version --format '{{.Server.Version}}'

echo
echo "== Preparing directories =="
mkdir -p "$ENV_DIR"
mkdir -p "$DOKPLOY_DIR"
mkdir -p "$TRAEFIK_DIR"
mkdir -p "$TRAEFIK_DYNAMIC_DIR"
mkdir -p "$TRAEFIK_DYNAMIC_DIR/certificates"
mkdir -p "$DOKPLOY_DIR/logs"
mkdir -p "$DOKPLOY_DIR/applications"
mkdir -p "$DOKPLOY_DIR/ssh"
mkdir -p "$DOKPLOY_DIR/monitoring"
mkdir -p "$DOKPLOY_DIR/schedules"
mkdir -p "$DOKPLOY_DIR/volume-backups"

chmod 700 "$ENV_DIR"
chmod 700 "$DOKPLOY_DIR"

echo
echo "== Creating env file if missing =="
if [ ! -f "$ENV_FILE" ]; then
  POSTGRES_PASSWORD="$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-40)"
  BETTER_AUTH_SECRET="$(openssl rand -base64 64 | tr -d '\n')"

  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=3000
TZ=Africa/Johannesburg

POSTGRES_USER=dokploy
POSTGRES_DB=dokploy
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

DATABASE_URL=postgresql://dokploy:${POSTGRES_PASSWORD}@dokploy-postgres:5432/dokploy

REDIS_HOST=dokploy-redis
REDIS_URL=redis://dokploy-redis:6379

BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
NEXT_PUBLIC_SITE_URL=https://${STACKER_DOMAIN}
EOF

  chmod 600 "$ENV_FILE"
else
  echo "Existing env file found: $ENV_FILE"
fi

sed -i 's/\r$//' "$ENV_FILE"

echo
echo "== Loading env file =="
set -a
. "$ENV_FILE"
set +a

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "ERROR: POSTGRES_PASSWORD missing from $ENV_FILE"
  exit 1
fi

if [ -z "${BETTER_AUTH_SECRET:-}" ]; then
  echo "ERROR: BETTER_AUTH_SECRET missing from $ENV_FILE"
  exit 1
fi

echo "Env loaded."

echo
echo "== Ensuring DATABASE_URL uses local POSTGRES_PASSWORD =="
python3 <<'PY'
from pathlib import Path
import os

env_path = Path("/etc/stacker/stacker.env")
lines = env_path.read_text().splitlines()

password = os.environ.get("POSTGRES_PASSWORD", "")
if not password:
    raise SystemExit("POSTGRES_PASSWORD not loaded")

database_url = f"DATABASE_URL=postgresql://dokploy:{password}@dokploy-postgres:5432/dokploy"

new_lines = []
found = False

for line in lines:
    if line.startswith("DATABASE_URL="):
        new_lines.append(database_url)
        found = True
    else:
        new_lines.append(line)

if not found:
    new_lines.append(database_url)

env_path.write_text("\n".join(new_lines) + "\n")
PY

echo
echo "== Redacted env preview =="
sed -E \
