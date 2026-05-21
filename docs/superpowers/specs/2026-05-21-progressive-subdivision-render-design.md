# Progressive Subdivision Rendering

**Date:** 2026-05-21
**Status:** Approved

## Problem

`SubdivisionLayer` uses `Promise.all` to wait for every fetch before calling `setData` once. Two consequences:

1. Cached features (ready immediately) are held back until all uncached fetches complete.
2. All features appear at once after the slowest fetch — an all-or-nothing flash rather than a progressive reveal.

## Solution

Replace the `Promise.all` gate with individual fetch chains. Each resolved feature is pushed to a `pendingRef` accumulator and flushed into state on the next animation frame. Cached features render on the same tick as mount with no waiting.

## Design

### State model

`data: FeatureCollection | null` → `features: Feature[]`, initialized to `[]`.

Incremental additions append to the array via `setFeatures(prev => [...prev, ...batch])`. The `visitedFeatures` memo removes the `if (!data) return []` guard — empty array is the natural initial state.

`FeatureCollection` import is removed (no longer needed).

### Loading flow

```
on mount (subdivisionCodes changes):
  cached = codes already in Feature cache → setFeatures(cached) immediately
  missing = codes not yet cached

  for each code in missing:
    fetch → resolve → setCachedFeature(code, feature)
                    → pendingRef.push(feature)
                    → scheduleFlush()
           → reject → setCachedFeature(code, null)   ← mark known-404

scheduleFlush():
  if RAF already queued → no-op (deduplicates concurrent arrivals)
  requestAnimationFrame(() =>
    batch = pendingRef.splice(0)          ← drain atomically
    if batch.length > 0:
      setFeatures(prev => [...prev, ...batch])
  )

on cleanup:
  cancelAnimationFrame(rafRef.current)
  pendingRef.current = []                 ← discard in-flight arrivals
```

### Batching

`requestAnimationFrame` caps re-renders at the display refresh rate (~60fps = one flush per 16ms). Multiple fetches completing within the same frame are batched into a single state update.

### Stale fetch protection

When `subdivisionCodes` changes mid-flight, cleanup drains `pendingRef` and cancels the RAF. Fetches that resolve after cleanup still call `setCachedFeature` (correct — cache is global and persistent) but push into a drained ref. The next flush sees an empty batch and skips `setFeatures`. No stale features render.

### POV-first behaviour

On second+ zoom-in (after predictive preload has run), POV-region features are already in the Feature cache → `setFeatures(cached)` fires immediately at mount with zero fetches. The remaining (non-POV) regions trickle in progressively. This is the primary POV-first win.

On first zoom-in (cold cache), all fetches fire simultaneously; browser connection scheduling and file sizes determine arrival order. Progressive rendering still shows regions appearing individually rather than all at once.

## Files changed

| File | Change |
|---|---|
| `components/globe/SubdivisionLayer.tsx` | Replace `Promise.all` + `FeatureCollection` state with progressive RAF-batched loading |

## Performance

| Scenario | Before | After |
|---|---|---|
| Mount with all cached | Immediate (existing) | Immediate (unchanged) |
| Mount with some cached | All wait for missing | Cached render immediately; missing trickle in |
| Mount with none cached | Wait for all fetches | Each renders as it arrives |
| Rapid `subdivisionCodes` change | Stale `Promise.all` could land late | Cleanup drains pending; stale arrivals discarded |
