# Implementation Plan: Progressive Subdivision Loading — Phase 1

**Spec:** [2026-05-21-progressive-subdivision-loading-design.md](./2026-05-21-progressive-subdivision-loading-design.md)

## Steps

### 1. Create `lib/subdivision-feature-cache.ts`

New file. Module-level `Map<string, Feature>` with three exports:

```ts
import type { Feature } from 'geojson'

const featureCache = new Map<string, Feature>()

export function getCachedFeature(code: string): Feature | undefined {
  return featureCache.get(code)
}

export function setCachedFeature(code: string, feature: Feature): void {
  featureCache.set(code, feature)
}

export function hasCachedFeature(code: string): boolean {
  return featureCache.has(code)
}
```

No dependencies on React or Three.js.

---

### 2. Update `components/globe/usePredictivePreload.ts`

- Remove `preloadedSubdivisionFiles: Set<string>`
- Update `preloadSubdivisionFile`: after fetch, parse JSON and call `setCachedFeature`. Guard with `hasCachedFeature` instead of the Set.
- Update `preloadSubdivisionGeometry`: read from Feature cache first (skip fetch for cached codes), fall back to fetch for missing ones.

Before:
```ts
const preloadedSubdivisionFiles = new Set<string>()

export function preloadSubdivisionFile(subdivisionCode: string): void {
  if (preloadedSubdivisionFiles.has(subdivisionCode)) return
  preloadedSubdivisionFiles.add(subdivisionCode)
  fetch(`/geo/subdivisions/${subdivisionCode}.geojson`).catch(() => {})
}
```

After:
```ts
export function preloadSubdivisionFile(subdivisionCode: string): void {
  if (hasCachedFeature(subdivisionCode)) return
  fetch(`/geo/subdivisions/${subdivisionCode}.geojson`)
    .then(r => r.json())
    .then((feature: Feature) => setCachedFeature(subdivisionCode, feature))
    .catch(() => {})
}
```

`preloadSubdivisionGeometry` similarly: for each code, if `hasCachedFeature` use the cached value; otherwise fetch and `setCachedFeature`.

---

### 3. Update `components/globe/SubdivisionLayer.tsx`

Change the loading `useEffect` to cache-first:

- Codes already in the Feature cache → collect immediately, no fetch
- Remaining codes → fetch, `setCachedFeature`, then merge into features

On mount, if all codes are cached, build the `FeatureCollection` synchronously (or in a microtask) — no async wait.

```ts
useEffect(() => {
  if (subdivisionCodes.length === 0) return

  const cached: Feature[] = []
  const missing: string[] = []

  for (const code of subdivisionCodes) {
    const f = getCachedFeature(code)
    if (f) cached.push(f)
    else missing.push(code)
  }

  if (missing.length === 0) {
    setData({ type: 'FeatureCollection', features: cached })
    return
  }

  Promise.all(
    missing.map(code =>
      fetch(`/geo/subdivisions/${code}.geojson`)
        .then(r => r.json() as Promise<Feature>)
        .then(f => { setCachedFeature(code, f); return f })
        .catch(() => null),
    ),
  ).then(results => {
    const fetched = results.filter((f): f is Feature => f !== null)
    setData({ type: 'FeatureCollection', features: [...cached, ...fetched] })
  })
}, [subdivisionCodes])
```

---

## Verification

1. `pnpm exec tsc --noEmit` — no type errors
2. Demo profile: zoom in → regions render. Zoom out → zoom in again → no network requests in DevTools (all from Feature cache).
3. Stress profile (`/stresstest`): zoom in once → ~500 fetches (first load, unchanged). Zoom out → zoom in → 0 fetches, instant render.
