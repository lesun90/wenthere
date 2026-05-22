# AGENTS.md

Purpose: reduce session-start token use. Do not rediscover the whole repo. Read this file first, then read only the files directly relevant to the user's request.

## Session Rules

- Start with this map, `package.json`, and only the target files named by the user or implied by the task.
- Use `rg`/`rg --files` for targeted searches. Avoid broad recursive reads, directory dumps, or opening large data files unless the task requires their exact contents.
- Treat uncommitted user work as owned by the user. Check `git status --short` before editing and do not revert unrelated changes.
- Prefer small, local edits that match existing patterns. Do not refactor across areas unless requested.
- Before claiming completion, run the narrowest useful verification command. For UI changes, prefer `pnpm build` or a focused browser check when practical.

## Project Snapshot

Beenthere is a Next.js app router travel-photo globe. It renders visited countries and regions on a 3D globe using React Three Fiber, Three.js, TopoJSON/GeoJSON data, and seeded traveler/photo profiles.

Primary stack:

- Next.js 15, React 19, TypeScript
- `@react-three/fiber`, `@react-three/drei`, `three`
- `topojson-client`
- Tailwind CSS 4 via `app/globals.css`
- pnpm 10

## Commands

- Dev server: `pnpm dev`
- Build: `pnpm build`
- Start built app: `pnpm start`
- Docker dev: `docker compose up`
- Docker production: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build`

Note: `pnpm lint` exists in `package.json`, but this Next version may not provide `next lint`. Prefer `pnpm build` for a reliable project-wide check unless linting has been repaired.

## File Map

- `app/page.tsx`: main first-screen experience.
- `app/demo/page.tsx`: interactive travel-photo globe demo route.
- `app/stresstest/page.tsx`: performance route using the larger generated Roamer profile.
- `app/layout.tsx`: root metadata and shell.
- `app/globals.css`: global styles and Tailwind import/theme surface.
- `components/IdentityStrip.tsx`: top-level identity/brand UI.
- `components/globe/GlobeScene.tsx`: main globe scene composition and interaction wiring.
- `components/globe/EarthMesh.tsx`: base earth mesh and texture behavior.
- `components/globe/CountryLayer.tsx`, `CountryFeature.tsx`: country rendering.
- `components/globe/SubdivisionLayer.tsx`, `SubdivisionFeature.tsx`: state/province rendering.
- `components/globe/GalleryPanel.tsx`, `FloatingCard.tsx`: photo/profile UI overlays.
- `components/globe/usePredictivePreload.ts`, `useSharedTexture.ts`: preload and texture hooks.
- `components/globe/types.ts`: shared globe component types.
- `data/seed.ts`: default demo traveler profile and photo data.
- `data/roamerProfile.ts`: large generated Roamer traveler profile.
- `lib/geo.ts`, `geodata.ts`, `geo-cache.ts`, `geo-registry.ts`, `geomath.ts`: geographic loading, caching, projection, registry, and math utilities.
- `lib/theme-context.tsx`: app theme context.
- `public/geo/countries-10m.json`: large country TopoJSON. Do not open unless debugging data shape or feature IDs.
- `public/geo/subdivisions/*.geojson`: generated per-subdivision files loaded on demand by `adm1_code`.
- `docs/`: planning and design notes. Read a specific doc only when the request mentions specs, milestones, design intent, or historical rationale.

## Targeted Reading Guide

- Visual/UI request: read the relevant `app/*/page.tsx`, the affected component under `components/`, and `app/globals.css`.
- Globe rendering request: read `components/globe/GlobeScene.tsx`, the relevant layer/feature component, `components/globe/types.ts`, and only the needed `lib/geo*` file.
- Data/profile request: read `data/seed.ts` or `data/roamerProfile.ts` plus the components that consume the changed fields.
- Performance/preload request: read `components/globe/usePredictivePreload.ts`, `useSharedTexture.ts`, `GlobeScene.tsx`, and any referenced design doc if the user asks for rationale.
- Geo boundary/feature ID request: inspect `lib/geo-registry.ts`, `lib/geodata.ts`, and use targeted queries against `public/geo/*.json` instead of opening the full files.
- Docker/deployment request: read `README.md`, `Dockerfile`, and the relevant `docker-compose*.yml`.
- Planning/spec request: read `docs/PLAN.md` first, then the named spec under `docs/superpowers/specs/`.

## Editing Notes

- Keep generated or large static geo files unchanged unless explicitly requested.
- Preserve the app-router structure; add route-specific UI under `app/<route>/page.tsx` and reusable pieces under `components/`.
- Keep globe domain types centralized in `components/globe/types.ts` when multiple globe components share them.
- Use structured geo utilities in `lib/` rather than duplicating parsing or projection logic inside React components.
