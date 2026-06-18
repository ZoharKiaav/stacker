#!/usr/bin/env bash
set -Eeuo pipefail

sudo apt update
sudo apt -y full-upgrade
sudo apt -y autoremove --purge
sudo apt -y autoclean

if [ -f /var/run/reboot-required ]; then
  echo "Reboot required. Run: sudo reboot"
else
  echo "Upgrade complete. No reboot required."
fi
