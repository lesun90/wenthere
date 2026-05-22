# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The primary development workflow uses Docker Compose:

```bash
# Start dev server with hot reload (localhost:3000)
docker compose up

# Production build and serve
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

To run without Docker (Node.js / pnpm required):

```bash
pnpm dev        # dev server
pnpm build      # production build
pnpm check:profile # profile-index sanity checks
pnpm start      # serve production build
pnpm lint       # ESLint via next lint
```

There is no general test runner configured. `pnpm check:profile` runs the focused profile-index sanity script.

Type-check without building:

```bash
pnpm exec tsc --noEmit
```

## Architecture

**Beenthere** is a Next.js 15 (App Router) single-page travel-photo globe. The root `/` redirects to `/demo`, which is the only live route. `app/stresstest` is a performance harness using the generated Roamer profile.

### Data model

Core domain types (`TravelPhoto`, `TravelerProfile`, `ProfileIndex`, etc.) are defined in `lib/types.ts`. The demo dataset is in `data/demoProfile.ts`, which exports `travelerProfile` — a hardcoded `TravelerProfile` used by the `/demo` route. A profile contains one `photos: TravelPhoto[]` array plus optional `presentation` hero/framing maps keyed by country or subdivision code. Countries and subdivisions are derived from photo locations; there is no backend, database, or API.

`TravelerProfile` is injectable: `GlobeScene` accepts `profile` as a prop (defaults to the seeded demo profile), enabling the performance page to pass in a different profile.

`lib/geodata.ts` builds the pure `ProfileIndex` once per profile identity in `GlobeScene`. Components should consume indexed summaries/lookups instead of scanning `profile.photos` directly. A country summary is emitted only when at least one subdivision in that country is renderable; country-only photos may enrich an already visited country, but must not create empty visited countries by themselves.

### Globe rendering (`components/globe/`)

The globe is a React Three Fiber (`@react-three/fiber`) scene inside a `<Canvas>`. Key components:

- **`GlobeScene`** — top-level orchestrator. Owns all navigation state as a `navStack: GlobeState[]` stack (`world → detail → subdivision → gallery`). Manages fly-to animations, hover info, hero overrides, and hero transforms.
- **`CountryLayer`** — fetches `public/geo/countries-10m.json` (TopoJSON), converts to GeoJSON features via `topojson-client`, and renders one `CountryFeature` per country.
- **`SubdivisionLayer`** — fetches generated `public/geo/subdivisions/<adm1_code>.geojson` files for subdivisions present in the active profile. Only mounted when `shouldRenderSubdivisions` is true (with a short CSS transition delay for unmounting).
- **`EarthMesh`** — the solid globe sphere with an atmosphere overlay.
- **`FloatingCard`** — screen-space hover tooltip (rendered in HTML overlay, not in the Three.js scene).
- **`GalleryPanel`** — photo gallery drawer that slides in when a subdivision is tapped.

Navigation is zoom-driven: `ZoomDetailController` watches camera distance each frame and switches `detailLevel` between `'world'` and `'detail'` at hard-coded thresholds (`ENTER_DETAIL_DISTANCE = 1.85`, `EXIT_DETAIL_DISTANCE = 2.35`). Country tap triggers an animated fly-to (`CameraController`) before pushing `subdivision` onto the nav stack.

### Geometry pipeline (`lib/`)

- **`lib/geo.ts`** — low-level math: `latLngToVec3`, `featureToFillGeometry` (flat-2D triangulation → sphere projection with adaptive subdivision), `featureToLineGeometry` (border edges).
- **`lib/geo-cache.ts`** — memoizes `THREE.BufferGeometry` instances keyed by `layer:id:role:radius`. Also computes and caches centroids and SVG paths. Each country/subdivision gets three geometries: fill (radius 1.001), photo (radius 1.0015), line/border (radius 1.002) — slightly different radii prevent z-fighting.
- **`lib/geomath.ts`** — `featureCentroid` and `geoJsonToSvgPath` for the hover card minimap.
- **`lib/geo-registry.ts`** — module-level Maps holding `Geometry | null` keyed by alpha-3 country code or subdivision `adm1_code`. Used so geometry is accessible outside React component trees (e.g., the hover card SVG minimap).
- **`lib/geodata.ts`** — `buildProfileIndex(profile)`, immutable add/remove/update helpers, and lightweight profile validation. The index groups photos by country/subdivision, resolves deterministic hero fallbacks, exposes renderable subdivision codes, and provides O(1) lookups during render.
- **`lib/subdivision-feature-cache.ts`** — module-level `Map<code, Feature | null>` caching parsed GeoJSON features by `adm1_code`. `null` entries mark known-404 codes so they are never re-fetched. Consumed by `SubdivisionLayer` (cache-first loading) and `usePredictivePreload` (stores parsed features on preload).

### Texture sharing (`components/globe/useSharedTexture.ts`)

A module-level `Map<url, SharedTextureEntry>` deduplicates `THREE.Texture` instances across all components. `useSharedTexture(url)` subscribes to the shared entry with a listener-set pattern (no external state library). `preloadSharedTexture(url)` starts loading without a React component.

### Predictive preloading (`components/globe/usePredictivePreload.ts`)

On country hover, the country's hero texture and subdivision GeoJSON files are preloaded. On country focus (tap), all subdivision hero textures and their GeoJSON geometries are preloaded before the fly-to animation completes.

### Geographic data files

- `public/geo/countries-10m.json` — Natural Earth 10m TopoJSON, `objects.countries` collection. Feature IDs are numeric ISO 3166-1.
- `public/geo/subdivisions/*.geojson` — generated Natural Earth admin-1 GeoJSON, one feature per file keyed by `properties.adm1_code`.
- `data/roamerProfile.ts` — generated Roamer traveler profile. It reads the per-subdivision GeoJSON files, includes all USA and Vietnam subdivisions, and adds selected China, Africa, and Europe regions.

Renderable subdivision codes in photo locations must match generated subdivision filenames and `adm1_code` values exactly (e.g. `"USA-3521"` for California).

### Theming

`lib/theme-context.tsx` provides a `useTheme()` hook and `ThemeProvider`. `GlobeScene` reads `theme` and selects from `GLOBE_PALETTES` (`dark` / `light`). The `IdentityStrip` component renders the theme toggle and user identity UI.
