# Progressive Subdivision Loading — Phase 1: Feature Cache

**Date:** 2026-05-21
**Status:** Approved

## Problem

`SubdivisionLayer` currently fetches all profile subdivisions simultaneously on mount. For the demo profile this is harmless (~10 files), but the stress profile (500 subdivisions) fires 500 parallel fetch requests on every zoom-in, causing a visible stall.

The root cause is not network latency — browser HTTP cache handles repeated requests — but the combination of 500 simultaneous fetch calls, JSON parses, and React state churn on every `SubdivisionLayer` mount/unmount cycle.

## Phase 1 scope

**One change: module-level Feature cache.**

Parsed GeoJSON `Feature` objects are stored in a module-level `Map<code, Feature>`. On remount (zoom out → zoom back in), `SubdivisionLayer` reads from the Map instead of re-fetching. Zero fetches, zero JSON parses, instant render for any previously loaded subdivision.

`SubdivisionLayer` continues to load all profile subdivisions (no country-scoping). Phase 1 fixes the remount cost. First-load cost for 500 subdivisions is unchanged.

## Architecture

### `lib/subdivision-feature-cache.ts` (new)

```ts
const featureCache = new Map<string, Feature>()

export function getCachedFeature(code: string): Feature | undefined
export function setCachedFeature(code: string, feature: Feature): void
export function hasCachedFeature(code: string): boolean
```

### `usePredictivePreload.ts`

Replaces `preloadedSubdivisionFiles: Set<string>` with the Feature cache. `preloadSubdivisionFile` is extended: after fetching, parse JSON and call `setCachedFeature`. Previously it only warmed the browser cache.

### `SubdivisionLayer.tsx`

Loading logic changes to cache-first:

```
for each code in subdivisionCodes:
  if hasCachedFeature(code) → use immediately, no fetch
  else → fetch → setCachedFeature → add to features
```

On mount, already-cached subdivisions are available synchronously — no `useEffect` / no async wait for those codes.

## Files changed

| File | Change |
|---|---|
| `lib/subdivision-feature-cache.ts` | New — module-level `Map<code, Feature>` |
| `components/globe/usePredictivePreload.ts` | Extend `preloadSubdivisionFile` to parse+cache; remove `preloadedSubdivisionFiles` Set |
| `components/globe/SubdivisionLayer.tsx` | Cache-first loading — skip fetch for already-cached codes |

## Performance impact

| Scenario | Before | After |
|---|---|---|
| First zoom-in (any profile) | n fetches | n fetches (unchanged) |
| Remount after zoom-out (demo) | ~10 fetches (browser cache) | 0 fetches |
| Remount after zoom-out (stress) | 500 fetches (browser cache) | 0 fetches |

## Future work (Phase 2)

The following were designed but deferred:

- **Country-scoped SubdivisionLayer** — `activeCountryCode` prop, renders only one country's subdivisions at a time. Fixes first-load cost for large profiles.
- **Camera-rest POV detection** (`useCameraRest`) — identifies center country after globe settles, triggers preload before user clicks.
- **`centerCountryCode` in `usePredictivePreload`** — third preload trigger alongside hover and focus; covers touch/mobile where hover never fires.
