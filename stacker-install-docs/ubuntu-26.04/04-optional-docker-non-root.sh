#!/usr/bin/env bash
set -Eeuo pipefail

# Optional convenience only.
# This allows the current Linux user to run docker without sudo.
# Security note: members of the docker group effectively have root-level control over the host.

sudo usermod -aG docker "$USER"

echo "Docker group added for: $USER"
echo "Log out and log back in, then test with: docker ps"
