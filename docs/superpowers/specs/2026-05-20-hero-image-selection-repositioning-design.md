# Hero Image Selection & Repositioning

**Date:** 2026-05-20  
**Status:** Implemented

---

## Overview

Two related features:

1. **Country hero selection** — inside the subdivision GalleryPanel, allow the user to designate any photo as the country-level hero (alongside existing region hero selection).
2. **Hero image repositioning** — a tap-to-edit interaction on a small shape-clipped preview opens an in-place framing overlay. The hero photo stays fixed while the geographic frame is dragged or scaled over it; this is inverted back into the saved `HeroTransform`. Changes are staged when the overlay is dismissed and committed to `GlobeScene` when the gallery is closed. Cancel closes the overlay without staging the edit.

---

## Data Model

No changes to `seed.ts`. All overrides live as runtime state in `GlobeScene`, mirroring the existing `subdivisionHeroOverrides` pattern.

```ts
type HeroTransform = {
  x: number
  y: number
  scale: number
}
```

New state in `GlobeScene`:

```ts
// existing
subdivisionHeroOverrides:  Record<string, string>        // subdivisionId → URL
// new
countryHeroOverrides:      Record<string, string>        // countryCode   → URL
subdivisionHeroTransforms: Record<string, HeroTransform> // subdivisionId → transform
countryHeroTransforms:     Record<string, HeroTransform> // countryCode   → transform
```

---

## GalleryPanel

### New props

```ts
countryCode:              string
initialCountryHeroUrl?:   string
initialSubdivisionTransform?: HeroTransform
initialCountryTransform?:     HeroTransform
onCountryHeroChange?:     (countryCode: string, url: string) => void
onSubdivisionTransformChange?: (subdivisionId: string, t: HeroTransform) => void
onCountryTransformChange?:     (countryCode: string, t: HeroTransform) => void
```

Geometry for the region and country previews is read by `GalleryPanel` from `lib/geo-registry.ts`, keyed by the stable `subdivisionId` and `countryCode`. The registry is populated by `SubdivisionLayer` and `CountryLayer` as GeoJSON is processed.

### Thumbnail strip — two action buttons per photo

Below each thumbnail, two buttons in a row (replacing the single star):

| Button | Icon | Action |
|--------|------|--------|
| Region hero | ★ (existing) | Set as subdivision hero |
| Country hero | 🌐 globe outline | Set as country hero |

Active state for each is independent — a photo can be both heroes simultaneously.

### Hero area — shape-clipped previews

When the currently displayed photo is the region hero and/or country hero, small shape-clipped previews appear bottom-right of the large hero image. Up to two previews stack vertically (region above country).

Each preview:
- ~56×56px bounding box
- SVG with `clipPath` using the region/country `geoJsonToSvgPath` output
- `<image>` inside the clip with the current `HeroTransform` applied
- Subtle border + shadow matching the FloatingCard aesthetic
- Tapping opens the in-place framing overlay for that shape

### Framing overlay

Rendered directly over the large hero image area. The thumbnail strip remains visible and the gallery layout does not shift. Triggered by tapping a shape preview.

**Layout:**
```
┌──────────────────────────────────┐
│  [Cancel]   Adjust framing       │
│                                  │
│  fixed hero image                │
│       ┌──────┐                   │
│       │shape │ ← draggable frame │
│       └──────┘                   │
│                                  │
│  Drag frame · Scroll/pinch resize│
└──────────────────────────────────┘
```

**Interaction:**
- Drag: move the shape frame over the fixed image
- Scroll / pinch: resize the frame
- Tap without dragging: stage the current transform and close
- Cancel: discard overlay edits and close

**Performance — drag is off React's render cycle:**
- On overlay open: convert the stored image-offset transform into frame position/scale
- During drag/scroll/pinch: update live refs and apply SVG group transforms directly with `setAttribute` — zero React renders
- On tap-dismiss: commit live ref → `GalleryPanel` staged state (1 render — updates small preview only)
- On Cancel: discard live ref

### Staging / commit pipeline

```
drag/resize → DOM ref (0 renders)
    ↓ overlay dismissed
GalleryPanel staged state (1 render — small preview updates)
    ↓ gallery closed (onBack)
GlobeScene state (1 render — FloatingCard SVG + 3D texture uniform)
```

Three renders total across the entire flow regardless of drag duration.

---

## FloatingCard — applying transforms

Currently uses:
```svg
<image preserveAspectRatio="xMidYMid slice" ... />
```

With a `HeroTransform`, wrap the image in a `<g transform>` to pan and scale while preserving aspect ratio. The transform origin is the center of the viewBox:

```svg
<g
  transform={`translate(${cx + tx}, ${cy + ty}) scale(${scale})`}
  clipPath={`url(#${clipId})`}
>
  <image
    x={-FRAME_VIEW_W / 2}
    y={-FRAME_VIEW_H / 2}
    width={FRAME_VIEW_W}
    height={FRAME_VIEW_H}
    preserveAspectRatio="xMidYMid slice"
  />
</g>
```

Where `cx = FRAME_VIEW_W / 2`, `cy = FRAME_VIEW_H / 2` (viewBox center), and `tx`/`ty` are the user's offsets in viewBox units derived from `HeroTransform.x * FRAME_VIEW_W` and `HeroTransform.y * FRAME_VIEW_H`.

When no `HeroTransform` is set, falls back to the original unwrapped `xMidYMid slice` image element.

---

## SubdivisionFeature — 3D texture UV transforms

Three.js UV transforms (`texture.offset`, `texture.repeat`, `texture.center`) are shader uniforms — updating them costs zero GPU re-upload.

**Lazy clone strategy:**
- `useSharedTexture` returns a shared `THREE.Texture` instance cached by URL
- When a `HeroTransform` is first applied to a subdivision, clone the texture once: `const clone = sharedTexture.clone()` — the clone shares the same underlying `WebGLTexture` on the GPU
- Apply transforms to the clone only: `clone.repeat.set(1 / scale, 1 / scale)`, then derive `offset.x` and `offset.y` from the transform
- When no transform or an identity transform is active, revert to the shared instance

This is implemented inside `SubdivisionFeature` using a `useRef` for the clone. Cleanup disposes the clone on unmount.

---

## GlobeScene — wiring

`GlobeScene` maintains the four new state maps and passes them down:

- `SubdivisionLayer` receives `subdivisionHeroTransforms` → forwards per-feature to `SubdivisionFeature`
- `CountryLayer` receives `countryHeroOverrides` (new) and `countryHeroTransforms`
- `GalleryPanel` receives all initial values and four callbacks; it resolves preview geometry through `geo-registry`

On `onBack` from `GalleryPanel`:
1. `onHeroChange` → update `subdivisionHeroOverrides`
2. `onCountryHeroChange` → update `countryHeroOverrides`
3. `onSubdivisionTransformChange` → update `subdivisionHeroTransforms`
4. `onCountryTransformChange` → update `countryHeroTransforms`

All four are optional — no-ops if the user made no changes during the session.

---

## Out of scope

- Country-level gallery panel (separate feature)
- Rotation of the hero image

---

## Deferred: Persistence (required before sharing goes live)

All four runtime state maps in `GlobeScene` are in-memory only:

```
subdivisionHeroOverrides   subdivisionHeroTransforms
countryHeroOverrides       countryHeroTransforms
```

Before the globe can be shared with other viewers, these must be persisted. This is tracked under **M5 — Add User** in `PLAN.md`. When that milestone is designed, the persistence layer must cover:

- **What to save:** all four maps above, keyed by user/profile ID, plus any future customization state
- **Granularity:** save on gallery close (already the commit point in this design) — no additional save triggers needed
- **Read path:** `[username]` page fetches saved profile → seeds `GlobeScene` initial state instead of `seed.ts` hardcoded values
- **Write path:** API route receives the four maps as a diff on gallery close; upserts to DB
- **Viewer vs. owner:** viewers get a read-only snapshot; owner sees live editable state
- **Storage options to evaluate at M5:** Postgres via Next.js API routes (Supabase or self-hosted), or localStorage as a stepping stone for single-device use before sharing is needed
