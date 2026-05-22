# Turborepo Monorepo Restructure Design

## Purpose

Restructure the current flat Next.js project into a Turborepo monorepo so that UI/UX
code, GitHub storage (Phase 1), and Supabase storage (Phase 2) are cleanly separated
into independent packages. One repo, multiple deployable apps, no code duplication.

## Goals

- Move existing UI/UX into `packages/ui` with zero rewrites.
- Isolate storage implementations into `packages/storage-github` and
  `packages/storage-supabase` so they can be swapped per app.
- `apps/personal` composes ui + storage-github — the Phase 1 deployable.
- `apps/service` is scaffolded for Phase 2 (Supabase, multi-user) but not implemented.
- All imports inside `packages/ui` work unchanged (`@/` alias preserved).
- Docker, scripts, and dev workflow continue to work.

## Non-Goals

- No rewrites of existing component or lib logic.
- No implementation of `packages/storage-supabase` (Phase 2 only).
- No publishing packages to npm.
- No CI/CD pipeline changes beyond what the monorepo requires.
- No visual or behavioral changes to the globe app.

## Monorepo Root

The current repo root becomes the monorepo root. Most existing files move into packages
or apps; the root stays lean.

```
beenthere/
├── turbo.json             ← task pipeline
├── pnpm-workspace.yaml    ← workspace config
├── package.json           ← devDeps: turbo only
├── tsconfig.base.json     ← shared TS compiler options, extended by all packages/apps
├── pnpm-lock.yaml         ← single lockfile for the whole workspace
├── docs/                  ← design specs
├── .gitignore
└── CLAUDE.md
```

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**`turbo.json`:**
```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**"] },
    "dev":   { "persistent": true, "cache": false },
    "lint":  { "dependsOn": ["^lint"] }
  }
}
```

**Root `package.json`** has only `turbo` as a devDependency. All app and package
dependencies live in their own `package.json` files.

## `packages/ui` — `@beenthere/ui`

The bulk of the current codebase. All UI components, domain types, geo utilities, and
pure profile mutation functions move here. Nothing is rewritten.

```
packages/ui/
├── package.json           ← name: "@beenthere/ui", private: true
├── tsconfig.json          ← extends ../../tsconfig.base.json
├── index.ts               ← barrel export of public API
├── components/            ← current components/ (all files, unchanged)
├── lib/                   ← current lib/ (minus indexed-db-store.ts)
│   └── profile-store/
│       ├── types.ts       ← ProfileStore interface (NEW — shared contract)
│       └── mutations.ts   ← pure profile mutation functions (unchanged)
├── data/                  ← demoProfile.ts, roamerProfile.ts
├── app/
│   └── globals.css        ← current app/globals.css
└── scripts/               ← check-profile-index.cjs, build-geo-metadata.cjs, split-geo.js
```

**`package.json` exports:**
```json
{
  "name": "@beenthere/ui",
  "private": true,
  "exports": {
    ".":   "./index.ts",
    "./*": "./*"
  }
}
```

The `"./*": "./*"` wildcard allows apps to import any file directly:
```ts
import { GlobeScene } from '@beenthere/ui/components/globe/GlobeScene'
import type { TravelerProfile } from '@beenthere/ui/lib/types'
```

**`globals.css`** moves to `packages/ui/app/globals.css`. Apps import it as:
```ts
import '@beenthere/ui/app/globals.css'
```
This works because `transpilePackages` makes Next.js treat the package as local source.

**`ProfileStore` interface** is new in `packages/ui/lib/profile-store/types.ts`:
```ts
export interface ProfileStore {
  getActiveProfile(): Promise<TravelerProfile | null>
  saveActiveProfile(profile: TravelerProfile): Promise<void>
  putPhotoBlob(key: string, file: File): Promise<void>
  deletePhotoBlob(key: string): Promise<void>
}
```
Both storage packages implement this interface. It is the seam that makes Phase 2 a
clean drop-in swap.

**pnpm scripts in `packages/ui/package.json`:**
```json
"scripts": {
  "check:profile":      "node scripts/check-profile-index.cjs",
  "build:geo-metadata": "node scripts/build-geo-metadata.cjs"
}
```
Run from monorepo root: `pnpm --filter @beenthere/ui check:profile`

## `packages/storage-github` — `@beenthere/storage-github`

Phase 1 GitHub storage implementation. Server-side only.

```
packages/storage-github/
├── package.json           ← name: "@beenthere/storage-github", private: true
├── tsconfig.json
├── index.ts               ← exports GitHubProfileStore + route handler functions
├── github-store.ts        ← GitHubProfileStore implements ProfileStore
├── github-api.ts          ← server-side GitHub Contents API wrapper
└── routes/
    ├── profile.ts         ← GET + PUT handler logic
    ├── photo.ts           ← POST handler logic
    └── photo-key.ts       ← GET proxy + DELETE handler logic
```

Route handlers are exported as plain async functions, not as Next.js files.
`apps/personal/app/api/` imports and re-exports them:

```ts
// apps/personal/app/api/profile/route.ts
export { GET, PUT } from '@beenthere/storage-github/routes/profile'
```

This satisfies Next.js route file discovery (must be under `app/api/`) while keeping
all logic in the package.

## `packages/storage-supabase` — `@beenthere/storage-supabase`

Phase 2 placeholder. Not implemented in this milestone.

```
packages/storage-supabase/
├── package.json           ← name: "@beenthere/storage-supabase", private: true
├── tsconfig.json
└── index.ts               ← empty; exports {} with a TODO comment
```

Exists so `apps/service` can reference the package without breaking the workspace.

## `apps/personal` — Phase 1 deployable

Thin Next.js app. Pages, API route wiring, and public assets only. No business logic.

```
apps/personal/
├── package.json           ← name: "@beenthere/personal"
├── tsconfig.json          ← extends ../../tsconfig.base.json, no @/ alias
├── next.config.ts         ← transpilePackages + geo cache headers
├── postcss.config.mjs
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── docker-compose.override.yml
├── .env.example
├── app/
│   ├── layout.tsx         ← imports @beenthere/ui/app/globals.css
│   ├── page.tsx           ← redirect to /demo
│   ├── demo/page.tsx      ← imports ProfileProvider, GlobeScene from @beenthere/ui
│   ├── stresstest/page.tsx
│   └── api/
│       ├── profile/route.ts       ← re-exports from @beenthere/storage-github
│       ├── photo/route.ts
│       └── photo/[key]/route.ts
└── public/
    ├── demo/              ← demo photo JPGs (moved from root public/demo/)
    └── geo/               ← countries-10m.json, subdivisions/ (moved from root public/geo/)
```

**`next.config.ts`:**
```ts
transpilePackages: ['@beenthere/ui', '@beenthere/storage-github']
```

**`package.json` dependencies:**
```json
{
  "name": "@beenthere/personal",
  "dependencies": {
    "@beenthere/ui": "workspace:*",
    "@beenthere/storage-github": "workspace:*",
    "next": "15.x"
  }
}
```

## `apps/service` — Phase 2 scaffold

Minimal placeholder. Not deployed in this milestone.

```
apps/service/
├── package.json           ← name: "@beenthere/service"
├── next.config.ts         ← transpilePackages: ['@beenthere/ui', '@beenthere/storage-supabase']
└── app/
    └── page.tsx           ← placeholder: "Service app — Phase 2 not yet implemented"
```

## TypeScript Aliases

**`tsconfig.base.json` (root):** Shared compiler options only. No path aliases.

**`packages/ui/tsconfig.json`:**
```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```
`@/` resolves to `packages/ui/` itself. Every existing `@/lib/...` and
`@/components/...` import inside the package works unchanged. Zero import rewrites
inside `packages/ui`.

**`apps/personal/tsconfig.json`:**
```json
{ "compilerOptions": { "paths": {} } }
```
No `@/` alias in apps. App-level files (`app/demo/page.tsx`, `app/layout.tsx`, API
route wrappers) import using package names:
```ts
import { GlobeScene } from '@beenthere/ui/components/globe/GlobeScene'
```
Only the small set of app-level files needs import updates — not the component library.

**`packages/storage-github/tsconfig.json`:**
```json
{ "compilerOptions": { "paths": { "@beenthere/ui/*": ["../ui/*"] } } }
```
Allows the storage package to import shared types from `@beenthere/ui/lib/types`
without circular dependencies. Resolves to source during type-checking;
`transpilePackages` handles it at build time.

## Docker

`Dockerfile` and `docker-compose*.yml` move to `apps/personal/`. Build context is
the monorepo root (all packages must be present to install deps).

**`apps/personal/Dockerfile` (key changes):**
```dockerfile
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/personal/ ./apps/personal/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @beenthere/personal build
```

**`apps/personal/docker-compose.yml`:**
```yaml
build:
  context: ../..            ← monorepo root
  dockerfile: apps/personal/Dockerfile
```

## Dev Workflow

```bash
# From monorepo root — runs all apps in parallel via Turborepo
pnpm dev

# Build apps/personal only
pnpm --filter @beenthere/personal build

# Type-check without building
pnpm --filter @beenthere/personal exec tsc --noEmit

# Run profile sanity check
pnpm --filter @beenthere/ui check:profile
```

## Migration Order

The restructure is a pure file reorganization — no logic changes. Safe order:

1. Add root `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`.
2. Create `packages/ui/` — move `components/`, `lib/`, `data/`, `app/globals.css`,
   `scripts/`. Add `ProfileStore` interface.
3. Create `packages/storage-github/` — scaffold only (no implementation yet).
4. Create `packages/storage-supabase/` — empty placeholder.
5. Create `apps/personal/` — move `app/`, `public/`, `next.config.ts`, Docker files.
   Update imports in app-level files. Add `transpilePackages`.
6. Create `apps/service/` — placeholder page only.
7. Update root `package.json` to workspace root shape.
8. Delete files that have moved (old root-level `components/`, `lib/`, etc.).
9. Verify: `pnpm install`, `pnpm --filter @beenthere/personal build`, `pnpm --filter @beenthere/ui check:profile`.

## Verification

- `pnpm install` from root resolves all workspace dependencies.
- `pnpm --filter @beenthere/personal build` produces a working Next.js build.
- `pnpm exec tsc --noEmit` (per package) passes with no errors.
- `pnpm --filter @beenthere/ui check:profile` passes.
- `pnpm dev` starts the dev server and the globe loads at `localhost:3000/demo`.
- No component or lib files are modified — only moved and re-referenced.
