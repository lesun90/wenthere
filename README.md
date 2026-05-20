# Beenthere

A travel-photo globe. Visited countries and regions covered with your photos.

## Prerequisites

[Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin on Linux).

## Development

```bash
docker compose up
```

Opens the app at [localhost:3000/demo](http://localhost:3000/demo).

Hot reload is active — changes to `app/` are reflected immediately without rebuilding the image.

### Live Debugger

The dev container exposes the Node.js inspector on port `9229`. Attach any DAP-compatible debugger to `localhost:9229`.

**VS Code** — add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Docker dev",
  "port": 9229,
  "address": "localhost",
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/app",
  "restart": true
}
```

Then run **Attach to Docker dev** from the Run & Debug panel after `docker compose up` is running.

## Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

Builds the standalone Next.js image and serves it at [localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env` before running if any variables are needed:

```bash
cp .env.example .env
```

No variables are required for M1.

## Project Structure

```
app/             Next.js app router
  demo/          /demo route (placeholder, becomes the globe in M2)
public/          Static assets
docs/            Design specs and planning
Dockerfile       Multi-stage: base → dev → builder → prod
docker-compose.yml          Base skeleton
docker-compose.override.yml Dev overrides (auto-applied by `docker compose up`)
docker-compose.prod.yml     Prod overrides
```
