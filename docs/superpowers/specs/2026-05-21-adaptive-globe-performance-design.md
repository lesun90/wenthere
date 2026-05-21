# Adaptive Globe Performance Design

**Date:** 2026-05-21
**Status:** Approved for planning

---

## Overview

Improve the Beenthere globe so rotation, zoom, initial load, and detail-mode transitions stay responsive on both desktop and mobile. The selected approach is an adaptive performance layer around the existing React Three Fiber scene.

The previous globe performance design added the important foundations: prepared geometry caching, shared texture loading, staged preload, and hover guards. This design builds on that work by making runtime quality respond to current pressure. When the user is rotating, zooming, on a mobile device, or the frame rate is strained, the globe should temporarily reduce expensive work. When the scene settles, richer visuals and preload work can resume.

The adaptive layer must distinguish user-driven interaction from intentional presentation movement. A future showcase mode, where the globe auto-rotates and presents selected photos, should not be treated as reduced-quality `interacting` state simply because the camera is moving. Showcase should favor the nicest available picture and richer presentation settings unless the device is actually strained.

This is not a full Three.js rewrite. The goal is to preserve the current photo-globe experience while making the expensive parts happen at better times.

---

## Goals

- Keep rotate and zoom responsive during initial load, normal use, and detail transitions.
- Support both desktop and mobile, with no assumption that desktop-only smoothness is enough.
- Cap renderer pixel ratio so high-DPR displays do not overload the scene.
- Reduce hover, raycast, preload, and subdivision work while the user is actively interacting.
- Delay expensive subdivision reveal on strained devices without leaving the globe visually broken.
- Preserve high-quality photo presentation for showcase/autoplay mode.
- Use bounded concurrency for background fetch, preload, and preparation work.
- Add lightweight development instrumentation so adaptive quality changes can be verified.

## Non-Goals

- Replacing React Three Fiber with imperative Three.js.
- Moving the full WebGL renderer to a worker or adopting OffscreenCanvas in this pass.
- Redesigning the globe visuals, gallery, theme system, or navigation model.
- Merging all country or subdivision geometry into one large mesh.
- Adding a server-side preprocessing pipeline.
- Building a permanent user-facing performance settings panel.
- Solving photo CDN, responsive image, upload, or persistence concerns.

---

## Architecture

Add a small adaptive quality layer owned by `GlobeScene`. It should observe interaction and frame pressure, then return a compact quality state for the scene and layers.

Suggested quality levels:

```ts
type GlobeQuality = 'idle' | 'interacting' | 'showcase' | 'strained'
```

`idle` means the scene is settled and can show the richest current visuals. `interacting` means user-driven pointer, wheel, pinch, or active navigation movement is happening and input responsiveness is the top priority. `showcase` means intentional autoplay or presentation movement is active and photo quality is the top priority. `strained` means recent frame timing shows the scene is below budget and needs more conservative settings. Mobile or high-DPR devices may start with conservative DPR caps, but they should not automatically override `showcase`.

The quality layer should produce concrete render controls:

```ts
interface AdaptiveGlobeQuality {
  quality: GlobeQuality
  dpr: [number, number]
  hoverEnabled: boolean
  preloadEnabled: boolean
  subdivisionRevealEnabled: boolean
  lineOpacityScale: number
  preferPresentationPhotos: boolean
}
```

`GlobeScene` should pass these values into `Canvas`, `CountryLayer`, `SubdivisionLayer`, and `usePerformancePreload`. Feature components should remain thin and use props rather than owning global performance decisions.

---

## Concurrency And Parallelism

Use concurrency for background work, but keep it bounded and priority-aware. The globe renderer, raycasting, material updates, and GPU texture upload still run on the main thread, so unlimited parallel work can make interaction worse.

Add a small task scheduling boundary for preload and preparation work. It should support:

- task priorities: interaction-critical, showcase presentation, navigation preparation, idle warmup
- small concurrency limits for network and texture preload work
- pause/resume when quality switches into or out of `interacting`
- presentation-priority work that can continue during `showcase`
- cancellation or stale-result guards when navigation state changes

Suggested first-pass limits:

- mobile or strained: one background preload task at a time
- desktop idle/showcase: two background preload tasks at a time
- subdivision geometry preparation: one task at a time unless it moves to a worker

Showcase photos should be queued ahead of normal idle warmup. Country and subdivision reveal work should be queued ahead of gallery thumbnail warmup. New heavy work should not start while the user is actively rotating or zooming, but already-started lightweight requests can finish and populate the cache.

Real parallelism is useful only for CPU-heavy geometry preparation. A Web Worker can be added after profiling shows subdivision preparation is a meaningful main-thread cost. The worker should return plain typed arrays or serializable geometry payloads; the main thread should still create `THREE.BufferGeometry` and upload GPU resources. This keeps the worker boundary clear and avoids trying to move the whole renderer off-thread.

---

## Components

### `components/globe/useAdaptiveGlobeQuality.ts`

Create a hook that tracks:

- recent pointer or wheel interaction
- active camera fly
- OrbitControls damping movement by comparing camera position across frames
- explicit showcase/autoplay state from `GlobeScene`
- viewport width and coarse pointer capability
- `window.devicePixelRatio`
- recent frame timing from `useFrame`

The hook should debounce the return to `idle` so quality is not toggled every frame. A practical first pass is to treat the scene as interacting for about 250-400 ms after the last user pointer or wheel event, to apply mobile DPR caps from viewport and pointer heuristics, and to enter `strained` only when recent frame times exceed the target budget for several frames. Showcase auto-rotation should enter `showcase`, not `interacting`, unless frame timing proves the device is strained.

Initial DPR policy:

- mobile idle/interacting/strained: cap at `1`
- mobile showcase: cap at `1` while still preferring presentation photos
- desktop idle: cap around `1.5`
- desktop interacting: cap around `1.25`
- desktop showcase: cap around `1.5`

Exact values can be adjusted during verification, but the renderer should never default to unbounded device pixel ratio.

### `GlobeScene`

`GlobeScene` remains the owner of navigation state, camera fly, gallery state, theme, and layer presence. It should use the adaptive hook and wire the returned values into the scene.

Responsibilities:

- set Canvas `dpr`
- notify the adaptive hook on pointer and wheel activity
- pass explicit showcase/autoplay state when that feature exists
- pass `hoverEnabled` to country and subdivision layers
- pass `preloadEnabled` into `usePerformancePreload`
- gate subdivision layer reveal with `subdivisionRevealEnabled`
- keep country view visible while subdivision detail is delayed

Gallery state should still dim the globe, and gallery interactions should not trigger broad globe work.

### `CountryLayer` And `SubdivisionLayer`

Both layers should accept `hoverEnabled`. When hover is disabled, pointer handlers should avoid calling parent hover state setters. This prevents hover-card updates and raycast-driven state churn while the camera is moving.

`SubdivisionLayer` should be allowed to mount slightly later on strained devices. The country-level photo fill should remain visible until subdivision reveal is ready, so zooming never produces an empty or confusing state.

### `usePerformancePreload`

Preload should become pausable and priority-aware. Country texture preload can still happen after the first usable render, but subdivision geometry and texture preload should only run when `preloadEnabled` is true or when a country fly is active on a non-strained device.

Showcase mode should be able to request presentation-priority preload for the photos it plans to display. Those photos should be warmed before or at the start of showcase whenever possible so the mode can show the nicest selected image rather than a lower-quality fallback caused by late loading.

If preload is paused because the user interacts, queued work should resume after the scene settles. Failed preload should stay silent and preserve the existing fallback behavior.

### Optional Geometry Worker

A worker-backed geometry preparation path is optional for the first implementation pass. Add it only if manual profiling or development instrumentation shows subdivision preparation is still causing main-thread stalls after DPR caps, hover guards, and bounded preload scheduling are in place.

If added, the worker should own raw feature-to-positions conversion and return serializable arrays. It should not import React, React Three Fiber, or create WebGL resources.

### Feature Components

`CountryFeature` and `SubdivisionFeature` should keep using cached geometry and shared textures. They may receive a small `lineOpacityScale` prop, but they should not independently detect device or FPS state.

The first implementation should focus on scheduling and DPR caps before adding visual simplification inside every feature.

---

## Runtime Behavior

### Initial Load

The first priority is an interactive base globe. The app should render the earth, country fills, country borders, camera controls, and shell before all photo and subdivision work finishes.

After first usable render:

1. Preload country hero textures during idle time.
2. Keep input responsive if the user starts rotating or zooming.
3. Resume preload when interaction settles.
4. Defer subdivision preload on strained devices until there is a clear navigation need or idle window.
5. Use bounded task scheduling instead of starting every preload at once.

### Rotation And Zoom

During rotate or zoom:

- cap DPR more aggressively
- disable hover-card updates
- pause new preload work
- avoid mounting subdivisions unless already active and needed
- keep existing geometry and material objects stable

When movement settles, hover and preload can resume.

### Showcase Mode

Showcase mode is presentation movement, not user interaction. Auto-rotation in this mode should use `showcase` quality so the globe can favor the nicest selected photos, richer opacity, and presentation-ready detail.

During showcase:

- do not classify auto-rotation alone as `interacting`
- keep presentation-priority photo preload enabled unless the device is strained
- prefer the selected showcase hero photo over lower-priority texture work
- run presentation preload with bounded concurrency rather than broad parallel loading
- allow hover/raycast work to stay disabled if the mode is non-interactive
- use mobile DPR caps without lowering photo priority
- degrade beyond DPR caps only when frame timing indicates real strain

If the user touches, drags, wheels, or pinches during showcase, the quality state can temporarily switch to `interacting` to prioritize input. After the user stops, the scene may return to `showcase`.

### Country To Subdivision

On country tap:

1. Start camera fly immediately.
2. Mark the scene as interacting while the fly is active.
3. If the device is not strained, begin subdivision preparation during the fly.
4. If the device is strained, wait until the camera settles before mounting subdivisions.
5. Keep country photo fill visible until subdivision reveal is ready.
6. Fade in subdivision meshes as they become available.

Navigation must not block on a complete subdivision preload.

### Gallery

Opening the gallery should not rebuild globe geometry or restart texture loads. Shared globe textures stay cached for the session. Browser image loading inside the gallery can remain separate.

---

## Data Flow

1. Geo files are fetched once by the existing layers and helpers.
2. `lib/geo-cache.ts` prepares and caches country and subdivision records.
3. `useSharedTexture.ts` shares texture loads and GPU texture objects by URL.
4. `useAdaptiveGlobeQuality` provides render and scheduling controls.
5. `GlobeScene` passes controls into Canvas, layers, and preload.
6. Layers render cached records and avoid high-frequency state updates while interaction is active.
7. Showcase mode can provide a prioritized list of presentation photos to the preload layer.
8. The preload scheduler runs queued work with bounded concurrency and stale-result guards.

The adaptive layer changes when expensive work runs. It should not change the seed data model or geodata lookup contracts.

---

## Error Handling

- If adaptive detection cannot use a browser API, fall back to conservative defaults.
- If frame timing is unavailable, use mobile and DPR heuristics only.
- If texture loading fails, keep the current warm fallback fill.
- If subdivision fetch or preparation fails, keep country-level visuals visible.
- If preload is paused or incomplete, do not block navigation.
- If a queued preload or preparation result becomes stale, drop it rather than mutating current state.
- If a worker fails or is unavailable, fall back to main-thread chunked preparation.
- If quality state changes rapidly, debounce the return to richer visuals to avoid flicker.

---

## Testing And Verification

### Automated Verification

Run:

```bash
pnpm build
```

### Manual Verification

Check `/demo` on desktop and a mobile-sized viewport:

- initial globe becomes interactive before all photo and subdivision assets finish loading
- rotate and zoom stay responsive during initial load
- hover cards do not stutter the globe while rotating
- zooming into detail mode does not freeze the scene
- country tap starts the camera fly immediately
- showcase auto-rotation keeps presentation photo quality unless the device is strained
- user input during showcase temporarily prioritizes responsiveness, then returns to presentation quality
- background preload uses bounded concurrency and does not flood all assets at once
- subdivisions may appear slightly later on strained devices, but the country view remains visible
- gallery open and back behavior still works
- dark and light themes both stay responsive

### Development Instrumentation

Add a lightweight development-only indicator or log that reports:

- current quality state
- current DPR cap
- whether hover is enabled
- whether preload is enabled
- whether presentation photos are being prioritized
- current preload queue depth and active task count
- recent approximate FPS or frame time bucket

This instrumentation should be easy to remove or keep hidden outside development. It is for validating behavior, not for users.

---

## Implementation Notes

Recommended implementation order:

1. Add `useAdaptiveGlobeQuality` with DPR caps and interaction settling.
2. Wire Canvas `dpr` and pointer/wheel activity into `GlobeScene`.
3. Add `hoverEnabled` guards to country and subdivision layers.
4. Add a bounded preload scheduler and make `usePerformancePreload` honor `preloadEnabled`.
5. Add showcase presentation-priority preload support.
6. Gate subdivision reveal on strained devices while preserving country visibility.
7. Add development-only instrumentation.
8. Tune thresholds through manual desktop and mobile checks.
9. Add a geometry worker only if profiling still shows main-thread preparation stalls.

Each step should preserve the current user-visible behavior before tuning the next control.
