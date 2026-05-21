# Progressive Subdivision Loading

**Date:** 2026-05-21
**Status:** Approved

## Problem

`SubdivisionLayer` currently fetches all profile subdivisions simultaneously on mount. For the demo profile this is harmless (~10 files), but the stress profile (500 subdivisions) fires 500 parallel fetch requests on every zoom-in, causing a visible stall.

The root cause is not network latency — browser HTTP cache handles repeated requests — but the combination of 500 simultaneous fetch calls, JSON parses, and React state churn on every `SubdivisionLayer` mount/unmount cycle.

## Solution

Three interlocking changes:

1. **`SubdivisionLayer` becomes country-scoped** — renders only the active country's subdivisions instead of all profile subdivisions.
2. **Module-level Feature cache** — parsed GeoJSON `Feature` objects are stored in a `Map<code, Feature>`. Revisited countries render instantly with zero fetches.
3. **Camera-rest POV detection** — after the globe settles (500ms of no camera movement), the center country is identified and its subdivisions are preloaded before the user clicks.

## Architecture

### Active country

`GlobeScene` tracks `activeCountryCode: string | null`:

- `current.level === 'subdivision' | 'gallery'` → locked to `current.countryCode` (explicit click)
- `current.level === 'detail'` → `hoveredCountryCode ?? centerCountryCode` (hover wins when available; POV is the fallback for touch/mobile where hover never fires)
- `current.level === 'world'` → `null` (SubdivisionLayer not mounted)

`SubdivisionLayer` receives `activeCountryCode` as a prop. It derives the subdivision codes for that country from the profile and loads only those.

### Module-level Feature cache (`lib/subdivision-feature-cache.ts`)

```ts
const featureCache = new Map<string, Feature>()

export function getCachedFeature(code: string): Feature | undefined
export function setCachedFeature(code: string, feature: Feature): void
export function hasCachedFeature(code: string): boolean
```

Replaces the existing `preloadedSubdivisionFiles: Set<string>` in `usePredictivePreload.ts`. The Map covers both "has been fetched" and "parsed data is available."

`preloadSubdivisionFile` is extended: after fetching, parse JSON and call `setCachedFeature`. Previously it only warmed the browser cache.

### `SubdivisionLayer` loading logic

```
for each code in activeCountryCode's subdivisions:
  if hasCachedFeature(code) → use immediately
  else → fetch → setCachedFeature → add to rendered set
```

When `activeCountryCode` changes:
- Already-cached countries render instantly (zero fetches)
- Uncached countries fetch only their own files (5–20 fetches max)
- New regions fade in as they arrive via the existing `opacityTarget` lerp mechanism
- Previous country's regions unmount and fade out

### Camera-rest detection (`components/globe/useCameraRest.ts`)

New hook, called from a Canvas-child component (same pattern as `CameraController` and `ZoomDetailController` — needs `useFrame`/`useThree` which require being inside the Canvas). `GlobeScene` renders a `<CameraRestController>` inside the Canvas that calls this hook and lifts `centerCountryCode` back up via a callback prop.

```ts
useCameraRest(onRest: () => void, idleMs = 500)
```

Implementation: in `useFrame`, compare `camera.position` to the previous tick. If the delta magnitude drops below epsilon for `idleMs` milliseconds, call `onRest`. Resets on any movement.

Note: `OrbitControls` has an `onEnd` event but with `enableDamping` the camera continues coasting after release. Debouncing on actual position change is more accurate.

### POV center country detection

Called inside `onRest` when `current.level === 'detail'`:

```ts
const camDir = camera.position.clone().normalize()
let best = null, bestDot = -1
for (const country of profile.countries) {
  const dot = camDir.dot(latLngToVec3(country.centroid[1], country.centroid[0], 1).normalize())
  if (dot > bestDot) { bestDot = dot; best = country.countryCode }
}
setCenterCountryCode(best)
```

Country centroids are memoized (computed once per country via `latLngToVec3`). Cost: O(n) dot products where n = visited countries — negligible at any realistic profile size.

Only fires at `detail` level. At `subdivision` or `gallery`, the active country is locked by the nav stack.

### `usePredictivePreload` extension

Adds `centerCountryCode` as a third input:

| Input | Trigger | Action |
|---|---|---|
| `hoveredCountryCode` | mouse enter country | preload hero texture + subdivision files into Feature cache |
| `centerCountryCode` | globe at rest (detail level) | same as hover |
| `focusedCountryCode` | country tapped | preload subdivision textures + run `prepareSubdivisionRecords` (geometry) |

Deduplication: `hasCachedFeature` prevents double-fetching regardless of which trigger fires first.

## Full prediction chain

```
User spins globe
  → stops → 500ms idle → useCameraRest fires
  → center country identified → subdivision files fetched → Feature cache filled

User hovers country (desktop)
  → same preload (deduped by cache)

User taps country
  → fly-to animation starts (700ms)
  → focusedCountryCode set → textures + geometry preloaded
  → fly completes → SubdivisionLayer reads Feature cache → instant render

User pans to a new country (detail level)
  → useCameraRest fires after 500ms idle
  → new country preloads

User revisits any country
  → hasCachedFeature → zero fetches → instant render
```

## Files changed

| File | Change |
|---|---|
| `lib/subdivision-feature-cache.ts` | New — module-level `Map<code, Feature>` |
| `components/globe/useCameraRest.ts` | New — camera idle detection hook |
| `components/globe/usePredictivePreload.ts` | Add `centerCountryCode` input; extend `preloadSubdivisionFile` to parse+cache; remove `preloadedSubdivisionFiles` Set |
| `components/globe/SubdivisionLayer.tsx` | Accept `activeCountryCode` prop; cache-first loading; drop full-profile fetch |
| `components/globe/GlobeScene.tsx` | Add `centerCountryCode` state; wire `useCameraRest`; derive and pass `activeCountryCode` |

## UX behaviour

- No loading spinners. Regions appear as they become ready.
- Partial render (some subdivisions visible while others still loading) is acceptable and looks natural.
- Transition between countries: new regions fade in (opacity 0→1), previous fade out — handled by the existing `opacityTarget` lerp in `SubdivisionFeature`.
- If user clicks before POV preload fires (fast click, no hover, no rest), the 700ms fly animation is loading time. In practice predictive preload + fly duration covers the common case.

## Performance impact

| Scenario | Before | After |
|---|---|---|
| Demo profile zoom-in (first) | ~10 fetches | ~10 fetches (same) |
| Demo profile zoom-in (revisit) | ~10 fetches (browser cache) | 0 fetches (Feature cache) |
| Stress profile zoom-in (first) | 500 fetches | ≤20 fetches (active country only) |
| Stress profile zoom-in (revisit) | 500 fetches (browser cache) | 0 fetches |
| Pan to new country (detail level) | N/A | ≤20 fetches after 500ms idle |
