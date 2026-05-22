# Beenthere

A travel-photo globe. Visited countries and regions covered with your photos.

## Prerequisites

[Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin on Linux).

## Development

```bash
docker compose up
```

Opens the app at [localhost:3000](http://localhost:3000).

Hot reload is active — changes to source files are reflected immediately without rebuilding the image.

Focused profile/index sanity checks can be run without Docker:

```bash
pnpm check:profile
```

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

No environment variables are required. See `.env.example` for future milestone placeholders.

## Project Structure

```
app/                        Next.js app router
  demo/                     Interactive travel-photo globe
components/globe/           3D globe React components
lib/                        Geographic geometry utilities
data/                       Seeded demo traveler profile and photos
public/geo/                 TopoJSON/GeoJSON geographic data files
docs/                       Design specs and planning
Dockerfile                  Multi-stage: base → dev → builder → prod
docker-compose.yml          Base service definition
docker-compose.override.yml Dev overrides (auto-applied by `docker compose up`)
docker-compose.prod.yml     Production overrides
```

Traveler profiles are photo-centric: `TravelerProfile.photos` is the source of truth, while `lib/geodata.ts` derives country/subdivision summaries, hero fallbacks, renderable subdivision codes, and counts through `buildProfileIndex`. A country is treated as visited only when it has at least one renderable subdivision visit, so country-only photos cannot create empty drill-down states.
