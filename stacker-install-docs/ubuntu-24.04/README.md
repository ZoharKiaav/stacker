# Ubuntu 24.04 LTS Install Baseline for Stacker / VPStacks

This folder tracks the baseline commands used after SSH login on a fresh Ubuntu 24.04 LTS VPS.

Scope:

- Ubuntu package refresh and upgrade
- common operating tools
- official Docker Engine install from Docker's apt repository
- verification commands

Out of scope for this baseline:

- Dokploy/Stacker app deployment
- DNS setup
- Swarm service updates
- production backup strategy
- provider-specific server sizing such as CX23/CX33/CX43

## Correct mental model

The VPS is not rebuilt each time the application changes.

Normal flow:

1. GitHub builds the Stacker Docker image.
2. GHCR stores the image.
3. The server pulls the image.
4. Docker/Swarm rolls out the new image to the running service.

This folder is only for the server foundation commands that make the Ubuntu host ready.

## Run order

```bash
bash docs/install/ubuntu-24.04/00-upgrade.sh
bash docs/install/ubuntu-24.04/01-essential-packages.sh
bash docs/install/ubuntu-24.04/02-install-docker-official.sh
bash docs/install/ubuntu-24.04/03-verify.sh
```

## Docker install source

Docker Engine is installed from Docker's official apt repository, not from Ubuntu's `docker.io` package.

Official Docker Ubuntu install docs:
https://docs.docker.com/engine/install/ubuntu/
