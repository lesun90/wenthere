# Predictive Lazy Loading — Design Spec

Replace the blanket startup preload in `usePerformancePreload` with a demand-driven strategy that loads textures and geometry one step ahead of the user's actual navigation.

## Problem

`usePerformancePreload` currently fires two idle-callback preloads on startup:
- All country hero textures (50 at scale)
- All subdivision hero textures when `shouldPreloadSubdivisions` flips true (500 at scale)

At 50 countries / 500 regions this causes ~500 HTTP requests at startup, unbounded VRAM growth, and sluggish initial load. The user may never visit most of those regions.

## Approach

Replace `usePerformancePreload` with `usePredictivePreload`, a hook driven by two state values from `GlobeScene`:

- `hoveredCountryCode` — set when the user hovers a country on the globe
- `focusedCountryCode` — set when the user taps a country and the fly animation begins

The hook stays in the same file (`components/globe/usePerformancePreload.ts`), renamed and rewritten.

## Data Flow

```
User hovers country
  → CountryLayer.handleHover → onCountryHover(countryCode)
  → GlobeScene sets hoveredCountryCode
  → usePredictivePreload: preloadSharedTexture(country.heroPic)  [1 texture]

User taps country (fly begins, 700ms window)
  → GlobeScene.handleCountryTap sets focusedCountryCode
  → usePredictivePreload in parallel:
      preloadSharedTexture(subdivision.heroPic) × N  [10–15 textures]
      fetch /geo/states-provinces-50m.json (browser-cached) → filter → prepareSubdivisionRecords

Fly completes
  → subdivisions render fully painted, no pop-in
```

## Hook Interface

```ts
usePredictivePreload({
  hoveredCountryCode: string | null,
  focusedCountryCode: string | null,
})
```

**On `hoveredCountryCode` change:**
- Look up `country.heroPic` from `travelerProfile`
- Call `preloadSharedTexture(heroPic)` — deduplicated by existing cache

**On `focusedCountryCode` change:**
- Look up `country.subdivisions` from `travelerProfile`
- Call `preloadSharedTexture(subdivision.heroPic)` for each — fires in parallel
- Fetch `/geo/states-provinces-50m.json`, filter features to this country's subdivision codes, call `prepareSubdivisionRecords`

**Behaviour details:**
- Effects fire immediately on state change (no idle callback) — 700ms fly window is the loading window
- Per-countryCode ref guards prevent duplicate work when the same country is re-hovered
- `prepareSubdivisionRecords` is idempotent — safe to call multiple times
- If `focusedCountryCode` changes mid-fly, the new effect fires immediately; no cancellation needed

## Files Changed

| File | Change |
|---|---|
| `components/globe/usePerformancePreload.ts` | Replace entire implementation with `usePredictivePreload` |
| `components/globe/GlobeScene.tsx` | Add `hoveredCountryCode` state; pass `onCountryHover` to `CountryLayer`; replace `usePerformancePreload` call with `usePredictivePreload` |
| `components/globe/CountryLayer.tsx` | Add `onCountryHover(countryCode: string)` prop; call inside `handleHover` |

No changes to `useSharedTexture`, `geo-cache`, `SubdivisionLayer`, `GalleryPanel`, or seed data.

## What Is Removed

- Idle-callback blanket preload of all country heroes at startup
- Idle-callback blanket preload of all subdivision heroes when detail view opens
- `shouldPreloadSubdivisions` boolean parameter on the old hook

## Caching Behaviour (Unchanged)

- `preloadSharedTexture` deduplication — re-hovering a country fires zero extra HTTP requests
- Browser HTTP cache — revisiting a country costs nothing after first load
- `geometryCache` in `geo-cache.ts` — subdivision geometry computed once per session

## Out of Scope

- LRU texture eviction (not needed: predictive loading keeps active set small)
- Server-side rate limiting
- S3/CDN integration
- Subdivision photo preloading (non-hero photos — loaded on gallery open, acceptable latency)
