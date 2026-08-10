#!/usr/bin/env bash
set -Eeuo pipefail

sudo apt update
sudo apt install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  apt-transport-https \
  software-properties-common \
  git \
  jq \
  unzip \
  zip \
  htop \
  ncdu \
  tree \
  rsync \
  nano \
  vim \
  ufw \
  fail2ban \
  unattended-upgrades \
  chrony \
  logrotate \
  openssl \
  dnsutils \
  net-tools
