# Notes

## Why this Docker method

This uses Docker's official apt repository so Docker updates are handled through normal apt workflows:

```bash
sudo apt update
sudo apt upgrade
```

It installs:

- `docker-ce` — Docker Engine
- `docker-ce-cli` — Docker CLI
- `containerd.io` — container runtime used by Docker
- `docker-buildx-plugin` — modern Docker build plugin
- `docker-compose-plugin` — Compose v2, used as `docker compose`

## What this does not do

This does not deploy Stacker.

It does not pull `ghcr.io/zoharkiaav/stacker:latest`.

It does not update Docker Swarm services.

That belongs in a later deployment guide.

## Correct wording

Use:

> Build the Stacker image, push it to GHCR, pull it on the server, and roll it out to the Docker/Swarm service.

Avoid:

> Rebuild the VPS.

The VPS is only upgraded or re-provisioned when intentionally doing host maintenance.
