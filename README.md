# Beenthere

A travel-photo globe. Visited countries and regions lit up with your photos.

## Monorepo structure

```
packages/
  ui/                 React components, lib utilities, domain types
  storage-local/      Filesystem storage for offline local dev
  storage-github/     GitHub repo storage (Phase 1 — personal use)
  storage-supabase/   Supabase storage (Phase 2 — multi-user, not yet implemented)
apps/
  web/                Deployable Next.js app (ui + storage-local/github)
  service/            Phase 2 multi-user app (scaffold only)
```

## Prerequisites

[Node.js 20+](https://nodejs.org) and [pnpm 10+](https://pnpm.io), or [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
corepack enable   # activates the pnpm version pinned in package.json
```

## Development

### Without Docker (recommended for local dev)

```bash
pnpm install
cd apps/web
pnpm dev
```

No `.env.local` needed — local filesystem storage is the default.

Opens the app at [localhost:3000](http://localhost:3000). Profile and photos are saved to `apps/web/dev-data/` (gitignored).

### With Docker

```bash
cd apps/web
docker compose up
```

Local filesystem storage is the default. To use GitHub storage, pass `STORAGE_BACKEND=github` inline:

```bash
docker compose up                          # local (default)
STORAGE_BACKEND=github docker compose up   # github
```

Store your GitHub credentials in `apps/web/.env` (loaded automatically by Docker Compose, gitignored):

```bash
GITHUB_TOKEN=ghp_...
GITHUB_STORAGE_REPO=owner/repo-name
GITHUB_OWNER_SECRET=some-long-secret
```

Hot reload is active. The dev container exposes the Node.js inspector on port `9229`.

**VS Code debugger** — add to `.vscode/launch.json`:

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

## Production

```bash
cd apps/web
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

Builds the standalone Next.js image and serves it at [localhost:3000](http://localhost:3000).

## Environment variables

Copy `apps/web/.env.example` to `apps/web/.env` (Docker) or `apps/web/.env.local` (pnpm dev) and fill in values.

| Variable | Required | Description |
|---|---|---|
| `STORAGE_BACKEND` | no | `local` (default) or `github` |
| `GITHUB_TOKEN` | github only | PAT with `repo` scope |
| `GITHUB_STORAGE_REPO` | github only | `owner/repo-name` of your private storage repo |
| `GITHUB_OWNER_SECRET` | github only | Secret that grants write access via `?edit=<secret>` URL |

## Useful commands

```bash
# Run dev server
pnpm --filter @beenthere/web dev

# Production build
pnpm --filter @beenthere/web build

# Profile/index sanity checks
pnpm --filter @beenthere/ui check:profile

# Rebuild geo metadata
pnpm --filter @beenthere/ui build:geo-metadata
```

## Data model

Traveler profiles are photo-centric: `TravelerProfile.photos` is the source of truth. `lib/geodata.ts` derives country/subdivision summaries, hero fallbacks, renderable subdivision codes, and visit counts via `buildProfileIndex`. A country is only considered visited when it has at least one renderable subdivision, so country-only photos cannot create empty drill-down states.

Photos imported by the owner are stored as files in the storage backend. The profile JSON references them by a stable blob key (`photo-<profileId>-<photoId>`), served at `/api/photo/<key>`.
