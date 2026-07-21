#!/usr/bin/env bash
set -Eeuo pipefail

# Stacker Reset / Uninstall Script
#
# Safe reset:
#   bash stacker-install-docs/reset-uninstall-stacker.sh reset
#
# Safe uninstall:
#   bash stacker-install-docs/reset-uninstall-stacker.sh uninstall
#
# Dangerous purge:
#   CONFIRM_PURGE=DELETE_STACKER_DATA bash stacker-install-docs/reset-uninstall-stacker.sh purge
#
# Default behavior does NOT delete volumes or config.

ACTION="${1:-reset}"

STACKER_CONTAINER="${STACKER_CONTAINER:-stacker}"
TRAEFIK_CONTAINER="${TRAEFIK_CONTAINER:-dokploy-traefik}"

POSTGRES_SERVICE="${POSTGRES_SERVICE:-dokploy-postgres}"
REDIS_SERVICE="${REDIS_SERVICE:-dokploy-redis}"

NETWORK_NAME="${NETWORK_NAME:-dokploy-network}"

VOLUMES_TO_PURGE=(
  "stacker-app-data"
  "stacker-postgres-data"
  "stacker-redis-data"
)

CONFIG_DIRS_TO_PURGE=(
  "/etc/stacker"
  "/etc/dokploy"
)

if [ "$(id -u)" != "0" ]; then
  echo "ERROR: Run as root."
  exit 1
fi

show_state() {
  echo
  echo "== Containers =="
  docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -E 'stacker|traefik|dokploy' || true

  echo
  echo "== Services =="
  docker service ls 2>/dev/null || true

  echo
  echo "== Volumes =="
  docker volume ls | grep -E 'stacker|dokploy' || true

  echo
  echo "== Networks =="
  docker network ls | grep -E 'dokploy|stacker|ingress' || true
}

safe_reset() {
  echo "== Safe reset: restart platform components only =="

  docker restart "$STACKER_CONTAINER" 2>/dev/null || true
  docker restart "$TRAEFIK_CONTAINER" 2>/dev/null || true

  echo
  echo "== Waiting =="
  sleep 10

  show_state
}

safe_uninstall() {
  echo "== Safe uninstall: remove running Stacker components, preserve volumes/config =="

  docker rm -f "$STACKER_CONTAINER" 2>/dev/null || true
  docker rm -f "$TRAEFIK_CONTAINER" 2>/dev/null || true

  docker service rm "$POSTGRES_SERVICE" 2>/dev/null || true
  docker service rm "$REDIS_SERVICE" 2>/dev/null || true

  sleep 5

  echo
  echo "Safe uninstall complete."
  echo "Preserved:"
  echo "  /etc/stacker"
  echo "  /etc/dokploy"
  echo "  Docker volumes: stacker-app-data, stacker-postgres-data, stacker-redis-data"

  show_state
}

dangerous_purge() {
  echo "== DANGEROUS PURGE REQUESTED =="

  if [ "${CONFIRM_PURGE:-}" != "DELETE_STACKER_DATA" ]; then
    echo "ERROR: Purge requires explicit confirmation."
    echo
    echo "If you really want to delete Stacker data, run:"
    echo "CONFIRM_PURGE=DELETE_STACKER_DATA bash stacker-install-docs/reset-uninstall-stacker.sh purge"
    exit 1
  fi

  safe_uninstall

  echo
  echo "== Deleting Docker volumes =="
  for volume in "${VOLUMES_TO_PURGE[@]}"; do
    docker volume rm "$volume" 2>/dev/null || true
  done

  echo
  echo "== Deleting config directories =="
  for dir in "${CONFIG_DIRS_TO_PURGE[@]}"; do
    rm -rf "$dir"
  done

  echo
  echo "Purge complete."
  show_state
}

case "$ACTION" in
  reset)
    safe_reset
    ;;
  uninstall)
    safe_uninstall
    ;;
  purge)
    dangerous_purge
    ;;
  *)
    echo "ERROR: Unknown action: $ACTION"
    echo "Use:"
    echo "  reset"
    echo "  uninstall"
    echo "  purge"
    exit 1
    ;;
esac