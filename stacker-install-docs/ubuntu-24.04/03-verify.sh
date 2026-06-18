#!/usr/bin/env bash
set -Eeuo pipefail

echo "== OS =="
lsb_release -a || true

echo
 echo "== Kernel =="
uname -a

echo
 echo "== Docker =="
sudo docker version || true
sudo docker compose version || true
sudo docker buildx version || true

echo
 echo "== Docker service =="
systemctl status docker --no-pager || true

echo
 echo "== Disk =="
df -h

echo
 echo "== Docker hello-world test =="
sudo docker run --rm hello-world
