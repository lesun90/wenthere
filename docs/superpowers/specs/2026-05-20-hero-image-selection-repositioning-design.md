# Hero Image Selection & Repositioning

**Date:** 2026-05-20  
**Status:** Approved

---

## Overview

Two related features:

1. **Country hero selection** — inside the subdivision GalleryPanel, allow the user to designate any photo as the country-level hero (alongside existing region hero selection).
2. **Hero image repositioning** — a tap-to-edit interaction on a small shape-clipped preview lets the user drag/scale how the hero image is framed within the country or region border. Changes are committed when the gallery is closed; Cancel reverts while the editor is open.

---

## Data Model

No changes to `seed.ts`. All overrides live as runtime state in `GlobeScene`, mirroring the existing `subdivisionHeroOverrides` pattern.

```ts
type HeroTransform = {
  x: number     // horizontal offset, % of image width (0 = centered)
  y: number     // vertical offset, % of image height (0 = centered)
  scale: number // zoom multiplier (1.0 = default fill)
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
subdivisionGeometry:      Geometry | null   // GeoJSON for region shape preview
countryGeometry:          Geometry | null   // GeoJSON for country shape preview
initialCountryHeroUrl?:   string
initialSubdivisionTransform?: HeroTransform
initialCountryTransform?:     HeroTransform
onCountryHeroChange?:     (countryCode: string, url: string) => void
onSubdivisionTransformChange?: (subdivisionId: string, t: HeroTransform) => void
onCountryTransformChange?:     (countryCode: string, t: HeroTransform) => void
```

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
- Tapping opens the editor sheet for that shape

### Editor sheet

Slides up over the thumbnail strip (~200–240px tall, replacing the strip). Triggered by tapping a shape preview.

**Layout:**
```
┌──────────────────────────────────┐
│  [Cancel]   Adjust position      │
│  ┌────────────────────────────┐  │
│  │  full image (draggable)    │  │
│  │       ┌──────┐             │  │
│  │       │shape │ ← clip mask │  │
│  │       └──────┘             │  │
│  └────────────────────────────┘  │
│  Drag · Scroll to zoom           │
└──────────────────────────────────┘
```

**Interaction:**
- Drag: pan the image within the clip mask
- Scroll / pinch: scale
- Dismiss (swipe down or tap outside): commits the current transform → updates the small preview
- Cancel: restores the transform snapshot taken when the editor opened

**Performance — drag is off React's render cycle:**
- On editor open: snapshot current `HeroTransform` in a ref
- During drag/scroll: update a live ref; apply transform directly to the SVG `<image>` via `ref.current.setAttribute('transform', ...)` — zero React renders
- On dismiss: commit live ref → `GalleryPanel` staged state (1 render — updates small preview only)
- On Cancel: discard live ref, restore snapshot (0 renders)

### Staging / commit pipeline

```
drag → DOM ref (0 renders)
    ↓ editor dismissed
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
<g transform={`translate(${cx + tx}, ${cy + ty}) scale(${scale})`}>
  <image
    x={-FRAME_VIEW_W / 2}
    y={-FRAME_VIEW_H / 2}
    width={FRAME_VIEW_W}
    height={FRAME_VIEW_H}
    preserveAspectRatio="xMidYMid slice"
    clipPath={`url(#${clipId})`}
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
- Apply transforms to the clone only: `clone.offset.set(x, y)`, `clone.repeat.set(1/scale, 1/scale)`, `clone.center.set(0.5, 0.5)`
- When `HeroTransform` is removed (reset), revert to the shared instance

This is implemented inside `SubdivisionFeature` using a `useRef` for the clone. Cleanup disposes the clone on unmount.

---

## GlobeScene — wiring

`GlobeScene` maintains the four new state maps and passes them down:

- `SubdivisionLayer` receives `subdivisionHeroTransforms` → forwards per-feature to `SubdivisionFeature`
- `CountryLayer` receives `countryHeroOverrides` (new) and `countryHeroTransforms`
- `GalleryPanel` receives all initial values and four new callbacks

On `onBack` from `GalleryPanel`:
1. `onCountryHeroChange` → update `countryHeroOverrides`
2. `onSubdivisionTransformChange` → update `subdivisionHeroTransforms`
3. `onCountryTransformChange` → update `countryHeroTransforms`

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
