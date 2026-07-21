#!/usr/bin/env bash
set -Eeuo pipefail

# Stacker Native Platform Installer
#
# Fresh VPS target:
#   Ubuntu 24.04 LTS
#   Docker installed by this script if missing
#   Docker Swarm initialized
#   dokploy-network overlay network
#   Postgres as Swarm service
#   Redis as Swarm service
#   Stacker app internal on 3000
#   Traefik public on 80/443
#
# Example:
#   PUBLIC_IP=46.224.208.167 \
#   STACKER_DOMAIN=stacker.example.com \
#   ACME_EMAIL=admin@example.com \
#   bash stacker-install-docs/install-stacker.sh

STACKER_IMAGE="${STACKER_IMAGE:-ghcr.io/zoharkiaav/stacker/stacker:latest}"

STACKER_DOMAIN="${STACKER_DOMAIN:-}"
PUBLIC_IP="${PUBLIC_IP:-${ADVERTISE_ADDR:-}}"
ACME_EMAIL="${ACME_EMAIL:-}"

TZ_VALUE="${TZ_VALUE:-Africa/Johannesburg}"

ENV_DIR="/etc/stacker"
ENV_FILE="/etc/stacker/stacker.env"

DOKPLOY_DIR="/etc/dokploy"
TRAEFIK_DIR="/etc/dokploy/traefik"
TRAEFIK_DYNAMIC_DIR="/etc/dokploy/traefik/dynamic"
TRAEFIK_CERT_DIR="/etc/dokploy/traefik/dynamic/certificates"

NETWORK_NAME="dokploy-network"

POSTGRES_SERVICE="dokploy-postgres"
REDIS_SERVICE="dokploy-redis"

POSTGRES_VOLUME="stacker-postgres-data"
REDIS_VOLUME="stacker-redis-data"
STACKER_VOLUME="stacker-app-data"

STACKER_CONTAINER="stacker"
TRAEFIK_CONTAINER="dokploy-traefik"

echo "== Stacker Native Platform Installer =="
echo

if [ "$(id -u)" != "0" ]; then
  echo "ERROR: Run as root."
  echo "Example:"
  echo "  sudo bash stacker-install-docs/install-stacker.sh"
  exit 1
fi

if [ -z "$STACKER_DOMAIN" ]; then
  printf "Enter Stacker domain, example stacker.example.com: "
  read -r STACKER_DOMAIN
fi

if [ -z "$STACKER_DOMAIN" ]; then
  echo "ERROR: STACKER_DOMAIN is required."
  exit 1
fi

if [ -z "$ACME_EMAIL" ]; then
  printf "Enter Let's Encrypt email, example admin@example.com: "
  read -r ACME_EMAIL
fi

if [ -z "$ACME_EMAIL" ]; then
  echo "ERROR: ACME_EMAIL is required."
  exit 1
fi

if [ -z "$PUBLIC_IP" ]; then
  echo "Detecting public IPv4 address..."
  PUBLIC_IP="$(curl -4fsSL --connect-timeout 10 https://ifconfig.io 2>/dev/null || true)"

  if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP="$(curl -4fsSL --connect-timeout 10 https://icanhazip.com 2>/dev/null | tr -d '\n' || true)"
  fi
fi

if [ -z "$PUBLIC_IP" ]; then
  printf "Enter public server IP for Docker Swarm advertise address: "
  read -r PUBLIC_IP
fi

if [ -z "$PUBLIC_IP" ]; then
  echo "ERROR: PUBLIC_IP / ADVERTISE_ADDR is required."
  exit 1
fi

echo
echo "Image:      $STACKER_IMAGE"
echo "Domain:     $STACKER_DOMAIN"
echo "Public IP:  $PUBLIC_IP"
echo "ACME email: $ACME_EMAIL"
echo "Timezone:   $TZ_VALUE"
echo

echo "== Installing required base packages =="
apt-get update
apt-get install -y ca-certificates curl gnupg openssl lsb-release iproute2

echo
echo "== Installing Docker if missing =="
if command -v docker >/dev/null 2>&1; then
  echo "Docker already installed."
else
  curl -fsSL https://get.docker.com | sh
fi

echo
echo "== Docker version =="
docker version --format '{{.Server.Version}}'

echo
echo "== Ensuring Docker service is enabled =="
systemctl enable docker >/dev/null 2>&1 || true
systemctl start docker >/dev/null 2>&1 || true

echo
echo "== Checking required ports =="
if ss -tulnp | grep -E ':80 |:443 |:3000 ' >/tmp/stacker-port-check.txt; then
  echo "ERROR: One or more required ports are already in use:"
  cat /tmp/stacker-port-check.txt
  echo
  echo "Free ports 80, 443, and 3000 before installing Stacker."
  exit 1
fi

echo "Ports 80, 443, and 3000 are free."

echo
echo "== Creating persistent directories =="
mkdir -p "$ENV_DIR"
mkdir -p "$DOKPLOY_DIR"
mkdir -p "$TRAEFIK_DIR"
mkdir -p "$TRAEFIK_DYNAMIC_DIR"
mkdir -p "$TRAEFIK_CERT_DIR"
mkdir -p "$DOKPLOY_DIR/logs"
mkdir -p "$DOKPLOY_DIR/applications"
mkdir -p "$DOKPLOY_DIR/ssh"
mkdir -p "$DOKPLOY_DIR/monitoring"
mkdir -p "$DOKPLOY_DIR/schedules"
mkdir -p "$DOKPLOY_DIR/volume-backups"

chmod 700 "$ENV_DIR"
chmod 700 "$DOKPLOY_DIR"
chmod 700 "$DOKPLOY_DIR/ssh"

echo
echo "== Creating /etc/stacker/stacker.env if missing =="
if [ ! -f "$ENV_FILE" ]; then
  POSTGRES_PASSWORD="$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-40)"
  BETTER_AUTH_SECRET="$(openssl rand -base64 64 | tr -d '\n')"

  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=3000
TZ=${TZ_VALUE}

POSTGRES_USER=dokploy
POSTGRES_DB=dokploy
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

DATABASE_URL=postgresql://dokploy:${POSTGRES_PASSWORD}@dokploy-postgres:5432/dokploy

REDIS_HOST=dokploy-redis
REDIS_URL=redis://dokploy-redis:6379

BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
NEXT_PUBLIC_SITE_URL=https://${STACKER_DOMAIN}
ADVERTISE_ADDR=${PUBLIC_IP}
TRAEFIK_PORT=80
TRAEFIK_SSL_PORT=443
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

echo
echo "== Ensuring DATABASE_URL uses the local POSTGRES_PASSWORD =="
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
  -e 's/(POSTGRES_PASSWORD=).*/\1REDACTED/' \
  -e 's/(BETTER_AUTH_SECRET=).*/\1REDACTED/' \
  -e 's#(DATABASE_URL=postgresql://dokploy:)[^@]*#\1REDACTED#' \
  "$ENV_FILE"

echo
echo "== Initializing Docker Swarm =="
SWARM_STATE="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo inactive)"

if [ "$SWARM_STATE" = "active" ]; then
  echo "Swarm already active."
else
  docker swarm init --advertise-addr "$PUBLIC_IP"
fi

docker node ls

echo
echo "== Creating dokploy-network overlay =="
docker network create --driver overlay --attachable "$NETWORK_NAME" 2>/dev/null || true
docker network ls | grep -E "dokploy-network|ingress" || true

echo
echo "== Creating persistent Docker volumes =="
docker volume create "$POSTGRES_VOLUME" >/dev/null
docker volume create "$REDIS_VOLUME" >/dev/null
docker volume create "$STACKER_VOLUME" >/dev/null

echo
echo "== Creating Postgres Swarm service =="
if docker service ls --format '{{.Name}}' | grep -qx "$POSTGRES_SERVICE"; then
  echo "$POSTGRES_SERVICE already exists."
else
  docker service create \
    --name "$POSTGRES_SERVICE" \
    --network "$NETWORK_NAME" \
    --replicas 1 \
    --env POSTGRES_USER="$POSTGRES_USER" \
    --env POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    --env POSTGRES_DB="$POSTGRES_DB" \
    --mount type=volume,source="$POSTGRES_VOLUME",target=/var/lib/postgresql/data \
    postgres:16
fi

echo
echo "== Creating Redis Swarm service =="
if docker service ls --format '{{.Name}}' | grep -qx "$REDIS_SERVICE"; then
  echo "$REDIS_SERVICE already exists."
else
  docker service create \
    --name "$REDIS_SERVICE" \
    --network "$NETWORK_NAME" \
    --replicas 1 \
    --mount type=volume,source="$REDIS_VOLUME",target=/data \
    redis:7
fi

echo
echo "== Waiting for Postgres =="
for i in {1..60}; do
  PG_CONTAINER="$(docker ps --filter "name=${POSTGRES_SERVICE}" --format '{{.Names}}' | head -n1 || true)"

  if [ -n "$PG_CONTAINER" ]; then
    if docker exec "$PG_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      echo "Postgres ready in: $PG_CONTAINER"
      break
    fi
  fi

  if [ "$i" -eq 60 ]; then
    echo "ERROR: Postgres did not become ready."
    docker service ps "$POSTGRES_SERVICE" || true
    if [ -n "$PG_CONTAINER" ]; then
      docker logs "$PG_CONTAINER" 2>/dev/null || true
    fi
    exit 1
  fi

  sleep 2
done

echo
echo "== Creating Traefik static config =="
cat > "$TRAEFIK_DIR/traefik.yml" <<EOF
global:
  sendAnonymousUsage: false

entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"
    http3: {}

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: "$NETWORK_NAME"
  file:
    directory: "/etc/dokploy/traefik/dynamic"
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: "$ACME_EMAIL"
      storage: "/etc/dokploy/traefik/dynamic/certificates/acme.json"
      httpChallenge:
        entryPoint: web
EOF

echo
echo "== Creating Stacker Traefik route =="
cat > "$TRAEFIK_DYNAMIC_DIR/stacker.yml" <<EOF
http:
  routers:
    stacker-http:
      rule: "Host(\`${STACKER_DOMAIN}\`)"
      entryPoints:
        - web
      middlewares:
        - stacker-redirect-https
      service: stacker-service

    stacker-https:
      rule: "Host(\`${STACKER_DOMAIN}\`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      service: stacker-service

  middlewares:
    stacker-redirect-https:
      redirectScheme:
        scheme: https
        permanent: true

  services:
    stacker-service:
      loadBalancer:
        servers:
          - url: "http://stacker:3000"
EOF

touch "$TRAEFIK_CERT_DIR/acme.json"
chmod 600 "$TRAEFIK_CERT_DIR/acme.json"

echo
echo "== Pulling Stacker image =="
docker pull "$STACKER_IMAGE"

echo
echo "== Starting Stacker internal container =="
docker rm -f "$STACKER_CONTAINER" 2>/dev/null || true

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
echo "== Starting dokploy-traefik =="
docker rm -f "$TRAEFIK_CONTAINER" 2>/dev/null || true

docker run -d \
  --name "$TRAEFIK_CONTAINER" \
  --restart unless-stopped \
  --network "$NETWORK_NAME" \
  -p 80:80 \
  -p 443:443 \
  -p 443:443/udp \
  -v "$TRAEFIK_DIR/traefik.yml:/etc/traefik/traefik.yml:ro" \
  -v "$TRAEFIK_DYNAMIC_DIR:/etc/dokploy/traefik/dynamic" \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  traefik:v3 \
  --configFile=/etc/traefik/traefik.yml >/dev/null

echo
echo "== Waiting for services =="
sleep 30

echo
echo "== Containers =="
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -E 'stacker|traefik|dokploy' || true

echo
echo "== Swarm services =="
docker service ls

echo
echo "== Ports =="
ss -tulnp | grep -E ':80 |:443 |:3000 ' || true

echo
echo "== HTTP check =="
curl -I "http://${STACKER_DOMAIN}" || true

echo
echo "== HTTPS check =="
curl -Ik "https://${STACKER_DOMAIN}" || true

echo
echo "== Stacker logs =="
docker logs --tail=120 "$STACKER_CONTAINER"

echo
echo "== Traefik logs =="
docker logs --tail=80 "$TRAEFIK_CONTAINER"

echo
echo "== Done =="
echo "Stacker should be available at:"
echo "https://${STACKER_DOMAIN}"
