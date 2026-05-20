# Globe Performance Optimization Design

**Date:** 2026-05-20
**Status:** Pending user review

---

## Overview

Optimize the Beenthere globe for three user-visible problems: lag during rotation, lag when switching from country view to subdivision view, and slow initial load. The selected approach is a targeted runtime optimization with a scale-ready cache boundary.

This design keeps the current React Three Fiber component structure, but separates expensive static globe work from interactive UI state. Country and subdivision geometry, centroids, memory lookups, and texture loads should be prepared once, cached for the session, and reused across mode changes. High-frequency animation progress should move out of React state so camera movement, opacity transitions, and orbit rotation do not force parent re-renders every frame.

This is not a full Three.js scene rewrite. The goal is to make the current architecture smoother now while creating a clean boundary for larger datasets later.

---

## Goals

- Make the globe interactive before photo and subdivision preload completes.
- Keep rotation smooth by avoiding geometry creation, texture load churn, and unnecessary React state updates during orbit interaction.
- Avoid a single heavy frame when switching from world mode to subdivision mode.
- Share texture work by URL so repeated photo usage does not duplicate loading or GPU texture setup.
- Keep the current UX behavior: country tap flies to the country, subdivision mode fades in, subdivision tap opens the gallery.

## Non-Goals

- Replacing React Three Fiber with imperative Three.js.
- Batching every country or subdivision into merged geometries.
- Adding server-side preprocessing for Natural Earth data.
- Changing the visual design, navigation model, or gallery behavior.
- Implementing a photo CDN, responsive image pipeline, or persistence layer.

---

## Architecture

Add a performance layer around the existing globe components.

### `lib/geo-cache.ts`

Create a cache for prepared feature records. This module should turn raw TopoJSON/GeoJSON features into reusable records:

```ts
interface PreparedFeatureRecord {
  id: string
  name: string
  centroid: [number, number]
  geometry: GeoJSON.Geometry | null
  fillGeometry: THREE.BufferGeometry
  lineGeometry: THREE.BufferGeometry
}
```

Country and subdivision records may use different radii, so the cache key must include layer type and geometry role. For example:

- `country:840:fill:1.001`
- `country:840:photo:1.0015`
- `country:840:line:1.002`
- `subdivision:USA-3521:fill:1.003`
- `subdivision:USA-3521:line:1.004`

The cache should also store centroids and hover-card SVG paths if those are still generated from geometry. This prevents repeated coordinate scans.

### `components/globe/useSharedTexture.ts`

Replace per-feature texture ownership with a shared texture cache keyed by URL.

The hook should expose a small state machine:

```ts
type SharedTextureState =
  | { status: 'idle'; texture: null }
  | { status: 'loading'; texture: null }
  | { status: 'ready'; texture: THREE.Texture }
  | { status: 'failed'; texture: null }
```

Multiple features requesting the same URL should share the same load and the same final `THREE.Texture`. Texture disposal should be conservative: keep loaded textures for the session unless the profile or data source changes. This avoids churn when moving between world, subdivision, and gallery states.

### `components/globe/usePerformancePreload.ts`

Add staged preload after the globe first becomes usable.

Preload order:

1. Country hero textures.
2. Subdivision feature preparation for visited subdivisions.
3. Subdivision hero textures.
4. Optional gallery thumbnails for the selected or likely next subdivision.

Preloading should run after the first interactive render rather than blocking the initial globe. Use browser scheduling where available, such as `requestIdleCallback`, with a `setTimeout` fallback.

### `components/globe/useDetailMaterialTransition.ts`

Replace the current `useDetailProgress` React state loop with a transition helper that stores progress in refs and updates Three material opacity directly during `useFrame`.

The current `useDetailProgress` calls `setProgress` on every animation frame. That makes `GlobeScene`, `CountryLayer`, and `SubdivisionLayer` participate in a React render loop during the mode transition. The new helper should keep frame-by-frame progress outside React and update existing material refs.

The React tree should only change at meaningful boundaries:

- subdivision layer starts mounting or is already mounted
- transition begins
- transition completes
- subdivision layer can be hidden or left resident depending on cache strategy

### Existing Components

`GlobeScene` remains the owner of navigation state. It should start the camera fly immediately on country tap and kick off subdivision preload while the camera is moving.

`CountryLayer` and `SubdivisionLayer` should consume prepared feature records from the cache and pass cached geometry into thinner feature components.

`CountryFeature` and `SubdivisionFeature` should no longer create geometry with `useMemo` from raw features. They should render prepared geometries and use shared texture state.

---

## Runtime Behavior

### Initial Load

Initial load should prioritize an interactive globe:

1. Render the earth sphere, base country fills/outlines, camera, controls, and identity UI.
2. Load country hero textures asynchronously.
3. Fade photo fills in as texture state becomes ready.
4. Start subdivision preload after first interaction-ready render.

The loading experience should not wait for subdivision data or every photo texture.

### Rotation

Rotation should be mostly camera movement over stable scene objects.

During orbit interaction:

- no feature geometry should be created
- no texture loads should be started because of rotation alone
- hover updates should be guarded so repeated pointer events do not cause needless parent re-renders
- material and geometry objects should be stable

Hover cards can still update, but hover state should only change when the hovered feature id changes.

### Country to Subdivision Switching

On country tap:

1. Begin camera fly immediately.
2. Start preparing visited subdivision records and hero textures during the fly.
3. Enter subdivision mode when the fly completes.
4. Fade in subdivision meshes that are ready.
5. Continue loading any remaining subdivision textures without blocking interaction.

If subdivision preparation is incomplete when the fly finishes, navigation should still complete. The globe should show the available detail state and fade in remaining subdivisions as they become ready.

### Gallery Open

Gallery opening should not trigger broad globe work. Gallery images can use normal browser image loading, but any hero textures already loaded for the globe should remain cached.

---

## Data Flow

1. Topology and GeoJSON files are fetched once.
2. The cache layer converts raw features into prepared records.
3. Geodata helpers attach visited country and subdivision memory metadata.
4. Layers filter prepared records by visited status and current mode.
5. Feature components render cached geometry and shared texture state.
6. The preloader warms likely next assets after the first usable render and during camera fly.

This keeps expensive parsing and geometry construction out of interaction paths.

---

## Error Handling

- If a raw feature cannot be prepared, drop only that feature and log a concise development warning.
- If a texture fails, keep the existing fallback color behavior and preserve click/hover interaction.
- If subdivision preload is incomplete, do not block navigation; fade in available subdivisions and continue loading.
- If `requestIdleCallback` is unavailable, use a delayed task fallback.
- If cached geometry is missing for a feature, render nothing for that feature rather than crashing the scene.

---

## Testing and Verification

### Automated Verification

Run:

```bash
pnpm build
```

If a test runner is added later, the first unit coverage should target:

- geometry cache keying and reuse
- shared texture state transitions
- preload ordering
- hover update guards

### Manual Verification

Check `/demo` in a browser:

- initial globe becomes interactive before all photo/subdivision preload completes
- country photos fade in without blocking rotation
- rotating the globe does not visibly stutter after initial assets settle
- country tap starts camera fly immediately
- subdivision mode does not freeze at reveal
- gallery opens and back navigation still work
- failed or missing textures still show fallback fills

### Performance Inspection

Use browser Performance tools or React DevTools Profiler when available:

- confirm the detail transition no longer causes `GlobeScene` React re-renders every animation frame
- confirm repeated rotation does not allocate new geometries
- confirm duplicate photo URLs do not create duplicate texture loads

---

## Implementation Notes

The first implementation pass should be incremental:

1. Add shared texture cache and switch feature components to it.
2. Add prepared geometry cache and move geometry creation out of feature components.
3. Add staged preload after first usable render and during camera fly.
4. Replace React-state detail progress with ref/material-driven transition updates.
5. Add hover update guards.

Each step should preserve the existing behavior before moving to the next one.
