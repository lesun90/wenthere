# Implementation Plan: Progressive Subdivision Rendering

**Spec:** [2026-05-21-progressive-subdivision-render-design.md](./2026-05-21-progressive-subdivision-render-design.md)

Single file: `components/globe/SubdivisionLayer.tsx`

---

## Steps

### 1. Update imports

Remove `FeatureCollection` from the geojson import (no longer used).
Add `useCallback` if needed (not required — `scheduleFlush` can be a plain ref-based closure).

Before:
```ts
import type { Feature, FeatureCollection, Geometry } from 'geojson'
```

After:
```ts
import type { Feature, Geometry } from 'geojson'
```

---

### 2. Replace state + add refs

Before:
```ts
const [data, setData] = useState<FeatureCollection | null>(null)
```

After:
```ts
const [features, setFeatures] = useState<Feature[]>([])
const pendingRef = useRef<Feature[]>([])
const rafRef = useRef<number | null>(null)
```

---

### 3. Replace the loading `useEffect`

Before (the entire `Promise.all` block):
```ts
useEffect(() => {
  if (subdivisionCodes.length === 0) return
  const cached: Feature[] = []
  const missing: string[] = []
  for (const code of subdivisionCodes) {
    if (hasCachedEntry(code)) {
      const f = getCachedFeature(code)
      if (f) cached.push(f)
    } else {
      missing.push(code)
    }
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
        .catch(() => { setCachedFeature(code, null); return null }),
    ),
  ).then(results => {
    const fetched = results.filter((f): f is Feature => f !== null)
    setData({ type: 'FeatureCollection', features: [...cached, ...fetched] })
  })
}, [subdivisionCodes])
```

After:
```ts
useEffect(() => {
  if (subdivisionCodes.length === 0) return

  const cached: Feature[] = []
  const missing: string[] = []
  for (const code of subdivisionCodes) {
    if (hasCachedEntry(code)) {
      const f = getCachedFeature(code)
      if (f) cached.push(f)
    } else {
      missing.push(code)
    }
  }

  setFeatures(cached)

  function scheduleFlush() {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const batch = pendingRef.current.splice(0)
      if (batch.length > 0) setFeatures(prev => [...prev, ...batch])
    })
  }

  for (const code of missing) {
    fetch(`/geo/subdivisions/${code}.geojson`)
      .then(r => r.json() as Promise<Feature>)
      .then(f => {
        setCachedFeature(code, f)
        pendingRef.current.push(f)
        scheduleFlush()
      })
      .catch(() => setCachedFeature(code, null))
  }

  return () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    pendingRef.current = []
  }
}, [subdivisionCodes])
```

---

### 4. Update `visitedFeatures` memo

Before:
```ts
const visitedFeatures = useMemo(() => {
  if (!data) return []
  const rawVisitedFeatures = data.features.filter(feature => {
    ...
  })
  ...
}, [data, visitedSubdivisions])
```

After:
```ts
const visitedFeatures = useMemo(() => {
  const rawVisitedFeatures = features.filter(feature => {
    ...
  })
  ...
}, [features, visitedSubdivisions])
```

Replace `data.features.filter` with `features.filter` and remove the `if (!data) return []` guard. Update the dependency array: `data` → `features`.

---

## Verification

1. `pnpm exec tsc --noEmit` — no new errors
2. Demo profile: zoom in → cached regions appear immediately, any uncached trickle in individually
3. Stress profile: zoom in → regions appear progressively one by one (not all at once after a delay)
4. Zoom out → zoom in again → all regions (now cached) appear immediately in one batch
