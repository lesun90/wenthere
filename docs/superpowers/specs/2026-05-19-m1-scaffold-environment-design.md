# M1 — Scaffold & Environment Design

**Date:** 2026-05-19
**Project:** Beenthere travel-photo globe
**Milestone:** M1 — Scaffold & Environment
**Status:** Approved

---

## Goal

Set up the project foundation so every future milestone can run consistently from a single command. A developer clones the repo, runs `docker compose up`, and opens the app at `localhost:3000/demo`.

---

## Project Structure

```
beenthere/
├── app/
│   ├── layout.tsx           ← root layout (html, body, Tailwind base)
│   ├── page.tsx             ← redirects to /demo
│   └── demo/
│       └── page.tsx         ← placeholder page ("Beenthere — coming soon")
├── public/
├── .env.example             ← empty now; documents pattern for M2+
├── .gitignore
├── docker-compose.yml           ← base skeleton (never run alone)
├── docker-compose.override.yml  ← dev config (auto-merged by `docker compose up`)
├── docker-compose.prod.yml      ← prod config (explicit -f flags)
├── Dockerfile               ← multi-stage: base → dev → builder → prod
├── next.config.ts           ← output: 'standalone' for prod stage
├── package.json             ← pnpm, Next.js app router, TypeScript, Tailwind
├── pnpm-lock.yaml
├── README.md
├── tailwind.config.ts
└── tsconfig.json
```

---

## Dependencies

Installed at scaffold time, used from M2 onward:

| Package | Purpose |
|---|---|
| `three` | 3D rendering |
| `@react-three/fiber` | React renderer for Three.js |
| `@react-three/drei` | Three.js helpers (OrbitControls, etc.) |
| `topojson-client` | TopoJSON → GeoJSON conversion |

---

## Dockerfile — Multi-Stage

### Stage 1: `base`
- `node:22-alpine`
- Enable pnpm via `corepack enable`
- Copy `package.json` + `pnpm-lock.yaml`
- `pnpm install --frozen-lockfile`

### Stage 2: `dev`
- `FROM base`
- Copy full source
- Expose ports `3000` (app) and `9229` (Node.js inspector)
- `CMD`: `pnpm dev` with `NODE_OPTIONS=--inspect=0.0.0.0:9229`

### Stage 3: `builder`
- `FROM base`
- Copy full source
- `RUN pnpm build`

### Stage 4: `prod`
- `FROM node:22-alpine` (clean image, no dev deps)
- Copy `.next/standalone`, `.next/static`, `public` from builder stage
- Expose port `3000`
- `CMD`: `node server.js` (Next.js standalone server)

Prod uses `output: 'standalone'` in `next.config.ts` to produce a minimal self-contained build.

---

## Docker Compose Files

### `docker-compose.yml` — base skeleton
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
```

`env_file: .env` is not included at M1 — no variables are needed yet and Docker Compose errors if the file is missing on a fresh clone. Added in M2 when real variables are introduced.

### `docker-compose.override.yml` — dev (auto-merged)
```yaml
services:
  app:
    build:
      target: dev
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "9229:9229"
    environment:
      NODE_ENV: development
      NODE_OPTIONS: --inspect=0.0.0.0:9229
```

### `docker-compose.prod.yml` — prod (explicit)
```yaml
services:
  app:
    build:
      target: prod
    environment:
      NODE_ENV: production
```

---

## Commands

| Purpose | Command |
|---|---|
| Dev (hot reload + debug) | `docker compose up` |
| Prod | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build` |
| Rebuild dev image | `docker compose build` |

---

## Debugger Setup

Node.js inspector listens on `0.0.0.0:9229` inside the dev container, forwarded to `localhost:9229` on the host. Attach any DAP-compatible debugger (VS Code launch config, WebStorm, Chrome DevTools) to `localhost:9229`.

---

## `/demo` Route

Placeholder page sufficient to confirm the app is running. No globe, no data — just a visible page at `localhost:3000/demo`. All future milestone work builds on top of this route.

---

## Done Criteria

- `docker compose up` cold-starts without errors
- `localhost:3000/demo` returns a visible placeholder page
- `localhost:9229` is open and accepts a debugger connection
- `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build` builds and serves the prod image
