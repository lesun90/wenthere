# Beenthere — Implementation Plan

**Project:** Beenthere travel-photo globe
**Status:** M2 complete
**Spec:** [design_spec.md](design_spec.md)

---

## Milestones overview

| # | Milestone | Status |
|---|-----------|--------|
| M1 | Scaffold & Environment | done |
| M2 | Globe UI/UX | done |
| M3 | Gallery | pending |
| M4 | Testing & Hardening | pending |
| M5 | Add User | pending |

---

## M1 — Scaffold & Environment

Set up the project foundation so every future milestone can run consistently from a single command.

- [ ] Init Next.js app (`app/` router, TypeScript, Tailwind); add `/demo` route as the entry point
- [ ] Install core deps: `three`, `@react-three/fiber`, `@react-three/drei`, `topojson-client`
- [ ] Add `Dockerfile` + `docker-compose.yml` with hot-reload volume mounts
- [ ] Add `.env.example` for any environment variables
- [ ] Write `README.md` with one-command local setup: `docker compose up`

**Done when:** `docker compose up` opens the app at `localhost:3000/demo` with a placeholder page.

---

## M2 — Globe UI/UX

Build the core visual experience in four sub-goals. Each sub-goal must run smoothly before proceeding to the next.

### G1 — Minimalist shell + spinning globe

A clean, Apple-style full-screen globe. Nothing else on screen.

- [ ] Create full-viewport `/demo` layout: deep-space background (`#080c14`), no nav, no header, no scroll
- [ ] Add `GlobeScene` component (`components/globe/GlobeScene.tsx`, `"use client"`): `<Canvas>` filling the viewport, `OrbitControls` with rotate, zoom, and inertia
- [ ] Add `EarthMesh` component (`components/globe/EarthMesh.tsx`): ocean sphere (`#C0C0C0`), atmosphere glow layer (outer sphere, white 5% opacity additive), demo island (`BoxGeometry`, `#F5F5F5`, lat 40°N / lng 100°E) — no textures
- [ ] Add lighting: ambient (`#FFFFFF`, intensity 0.3) + directional (`#FFFFFF`, intensity 1.2, position (5,3,5))
- [ ] Tune feel: damping (`dampingFactor: 0.05`), zoom limits (`minDistance: 1.5`, `maxDistance: 4`), auto-rotate on idle (`speed: 0.4`), pauses on pointer-down

**Done when:** globe spins smoothly at 60 fps, controls feel responsive and natural, demo island visible as a lighter patch on the sphere.

---

### G2 — All countries outlined on the globe

Every country border visible as a clean line overlay.

- [ ] Download Natural Earth 110m world TopoJSON; commit to `public/geo/world-110m.json`
- [ ] Build `CountryLayer` component: TopoJSON → GeoJSON features → `THREE.BufferGeometry` line segments projected onto the sphere
- [ ] Style: thin white lines at ~0.4 opacity; readable but not overpowering

**Done when:** all ~195 country borders render without z-fighting, globe rotation stays smooth with borders on.

---

### G3 — Photo textures cover visited countries and subdivisions

Seeded visited countries and subdivisions display travel photos. The full worldwide subdivision dataset is loaded but only visited subdivisions are ever rendered.

- [ ] Download the full Natural Earth 50m admin-1 dataset (all ~4,000 worldwide features); replace the current filtered `public/geo/states-provinces-50m.json`
- [ ] Create `data/seed.ts`: traveler profile + memories for US, China, Vietnam — each memory has `countryCode`, `heroPhotoPath`, `caption`, and optionally `subdivisionCode` (matching `adm1_code` from the GeoJSON) + `subdivisionHeroPhotoPath`
- [ ] Gather 3–5 license-safe placeholder photos per country and ≥ 3 subdivisions per country; commit to `public/demo/` with attribution
- [ ] Build `lib/geodata.ts`: derives two lookups from seed data — `visitedCountries: { [countryCode]: heroPhotoUrl }` and `visitedSubdivisions: Set<string>` (the set of `adm1_code` values that have a photo) — decoupled from the globe renderer
- [ ] In `CountryLayer`: render visited countries as filled `THREE.Mesh` with photo texture mapped to the polygon; non-visited countries stay transparent
- [ ] In `SubdivisionLayer`: load the full worldwide dataset but only instantiate and render features whose `adm1_code` is in `visitedSubdivisions` — this keeps draw calls proportional to photos taken, not world geography
- [ ] Add hover state: pointer-enter shows country/subdivision name + small photo thumbnail in a fixed HUD overlay
- [ ] Add fallback: photo load failure → warm accent fill; no blank or broken state

**Done when:** visited countries visually pop against the base globe; subdivision mode shows only photo-backed regions (not all world subdivisions); hover tooltip appears cleanly; fallback color shows when photo is missing.

---

### G4 — Zoom reveals sub-regions filled with photos

Zooming into a supported country dissolves the country fill and reveals province/state polygons, each with its own photo.

- [ ] Download and commit state/province GeoJSON for US, China, Vietnam to `public/geo/`
- [ ] Extend `data/seed.ts`: add subdivision memories with `subdivisionCode`, `heroPhotoPath` for ≥ 3 regions per country
- [ ] Add zoom threshold listener in `GlobeScene`: below ~3× Earth radius, set `showSubdivisions: true` for supported countries
- [ ] Build `SubdivisionLayer`: lazy-load matching GeoJSON on first zoom, render filled polygons with photo textures, same hover behavior as country level
- [ ] Cross-fade transition: at zoom threshold, fade country fill out and subdivision fills in over ~300 ms
- [ ] Fallback: if subdivision GeoJSON fails, keep country-level photo visible; never show empty geography

**Done when:** zoom into US, China, and Vietnam triggers subdivision reveal; zoom out collapses cleanly; transitions feel fluid.

---

## M3 — Gallery *(upcoming)*

Lightweight photo panel that appears when a viewer selects a visited place.

- Gallery overlay or side panel for selected country/subdivision
- Photo list, captions, location labels
- Close/back behavior
- Responsive for desktop and mobile

---

## M4 — Testing & Hardening *(upcoming)*

Tests around core product behavior, fallback states, and final polish.

---

## M5 — Add User *(upcoming)*

Move from single seeded demo toward a real profile model.

---

## Out of scope (all versions)

Real accounts, photo upload UI, EXIF extraction, reverse geocoding, private sharing, social features, payment flows, exhaustive global subdivision coverage.
