# Beenthere

A travel-photo globe. Visited countries and regions lit up with your photos.

## Monorepo structure

```
packages/
  ui/                 React components, lib utilities, domain types
  storage-local/      Filesystem storage for offline local dev
  storage-github/     GitHub repo storage (Phase 1 - personal use)
  storage-cloud/      Cloud storage helpers for Supabase, R2, and image variants
apps/
  web/                Deployable Next.js app (ui + storage-local/github)
  service/            Dedicated multi-user app (Supabase Auth/Postgres + R2)
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

No `.env.local` needed - local filesystem storage is the default.

Opens the app at [localhost:3000](http://localhost:3000). Profile and photos are saved to `apps/web/dev-data/` (gitignored).

### Multi-user service app

`apps/service` is the dedicated beta deployment for multi-user Beenthere. It keeps the first-screen globe surface, uses `@beenthere/storage-cloud`, and expects Supabase plus Cloudflare R2 credentials in cloud-dev or production.

```bash
cp apps/service/.env.example apps/service/.env.local
pnpm --filter @beenthere/service dev
```

Without those credentials, cloud API routes return a clear 503 response listing the missing variables. Beta access is admin-created users only through the Supabase `beta_users` table.

To run the same service app in Docker during development:

```bash
cd apps/service
cp .env.example .env
docker compose up --build
```

The service opens at [localhost:3001](http://localhost:3001). Hot reload is active through the bind mount, and the Node.js inspector is exposed on port `9230`.

### Demo-user profile flow

Use `apps/web` for offline demo-user work. It does not need Supabase or R2.

```bash
pnpm --filter @beenthere/web dev
```

Open [localhost:3000/demo](http://localhost:3000/demo). The app seeds the globe from `apps/web/data/demoProfile.json`, then `LocalProfileStore` saves edits to `apps/web/dev-data/profile-demo-traveler.json`. Imported photos are written to `apps/web/dev-data/photos/` and served through `/api/photo/<key>`.

The demo user can manage their own local profile from the globe:

- Click **Manage gallery** to import photos.
- Edit captions, dates, countries, and subdivisions in the gallery flow.
- Pick country or region heroes and adjust framing.
- Delete photos from the local profile.

The Roamer stress profile works the same way at [localhost:3000/stresstest](http://localhost:3000/stresstest), using `apps/web/dev-data/profile-roamer.json` when local edits exist.

`apps/service` does not use the demo-user local store. It uses `CloudProfileStore` and the cloud APIs. Admin profile diagnostics and cleanup work against Supabase/R2 now; owner profile upload/edit routes are still the next cloud slice.

### Admin page

Run the service app and open [localhost:3001/admin](http://localhost:3001/admin).

```bash
pnpm --filter @beenthere/service dev
```

The admin page is the beta operations surface for the multi-user deployment. It is reserved for:

- listing profiles and photo counts
- checking storage usage and upload status
- hiding or suspending public profile display
- seeing quota alerts
- triggering failed/deleted/orphaned object cleanup

Access requires a Supabase access token for a user with a matching row in `public.admin_users`. Paste that token into the admin page. The page stores it in `sessionStorage` for the current browser session and sends it as `Authorization: Bearer <token>` to the admin APIs.

Admin-created beta users live in `public.beta_users`. To grant admin access, insert the authenticated user's id into `public.admin_users` with role `admin`.

Working admin endpoints:

- `GET /api/admin/profiles` lists profiles with photo counts, storage bytes, visibility, suspension, and deleted state.
- `PATCH /api/admin/profiles` hides/shows public profiles and suspends/restores public display.
- `POST /api/admin/storage-cleanup` dry-runs or deletes R2 objects for failed/deleted photo rows.

Without service credentials, admin APIs return a 503 response listing the missing environment variables.

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

**VS Code debugger** - add to `.vscode/launch.json`:

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

### Multi-user service deployment

The service app builds as a standalone Next.js container. Put production Supabase and R2 values in `apps/service/.env` or export them in the deployment environment, then run:

```bash
cd apps/service
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

For registry-based deployment, build and push the production image from the repo root:

```bash
docker build -f apps/service/Dockerfile --target prod -t registry.example.com/beenthere/service:latest .
docker push registry.example.com/beenthere/service:latest
```

Run the image with `PORT=3001` and the service environment variables below. Apply `apps/service/supabase/migrations` to the target Supabase project before sending beta traffic.

## Environment variables

Copy `apps/web/.env.example` to `apps/web/.env` (Docker) or `apps/web/.env.local` (pnpm dev) and fill in values.

For the multi-user service, copy `apps/service/.env.example` to `apps/service/.env` for Docker Compose or `apps/service/.env.local` for local `pnpm dev`.

| Variable | Required | Description |
|---|---|---|
| `STORAGE_BACKEND` | no | `local` (default) or `github` |
| `GITHUB_TOKEN` | github only | PAT with `repo` scope |
| `GITHUB_STORAGE_REPO` | github only | `owner/repo-name` of your private storage repo |
| `GITHUB_OWNER_SECRET` | github only | Secret that grants write access via `?edit=<secret>` URL |
| `NEXT_PUBLIC_SUPABASE_URL` | service only | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | service only | Supabase anon key for browser/session flows |
| `SUPABASE_SERVICE_ROLE_KEY` | service only | Server-only Supabase service role key |
| `R2_ACCOUNT_ID` | service only | Cloudflare account id for R2 S3-compatible API |
| `R2_ACCESS_KEY_ID` | service only | R2 access key id |
| `R2_SECRET_ACCESS_KEY` | service only | R2 secret access key |
| `R2_BUCKET` | service only | Private R2 bucket for original/display/thumb image objects |

## Useful commands

```bash
# Run dev server
pnpm --filter @beenthere/web dev
pnpm --filter @beenthere/service dev

# Production build
pnpm --filter @beenthere/web build
pnpm --filter @beenthere/service build

# Multi-user service checks
pnpm --filter @beenthere/storage-cloud test
pnpm --filter @beenthere/service test
pnpm --filter @beenthere/service build

# Multi-user service Docker
cd apps/service && docker compose up --build
cd apps/service && docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# Profile/index sanity checks
pnpm --filter @beenthere/ui check:profile

# Rebuild geo metadata
pnpm --filter @beenthere/ui build:geo-metadata
```

## Data model

Traveler profiles are photo-centric: `TravelerProfile.photos` is the source of truth. `lib/geodata.ts` derives country/subdivision summaries, hero fallbacks, renderable subdivision codes, and visit counts via `buildProfileIndex`. A country is only considered visited when it has at least one renderable subdivision, so country-only photos cannot create empty drill-down states.

Photos imported by the owner are stored as files in the storage backend. The profile JSON references them by a stable blob key (`photo-<profileId>-<photoId>`), served at `/api/photo/<key>`.
