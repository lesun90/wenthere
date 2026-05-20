# UX/UI Implementation Design

**Date:** 2026-05-20
**Status:** Approved for implementation planning

---

## Overview

Implement the Beenthere UX/UI proposal across seven areas: design tokens + fonts, identity strip, hover floating card, country-tap navigation, subdivision-tap gallery panel, earth surface colors, and loading state. The central architectural change is replacing the current `detailLevel` state in `GlobeScene` with a typed navigation stack that models the three-level interaction flow: world → subdivision (centered country) → gallery.

---

## 1. State Model

Replace `detailLevel: 'country' | 'subdivision'` and the existing `hoverInfo` prop threading in `GlobeScene` with a navigation stack.

### Navigation stack

```ts
type GlobeState =
  | { level: 'world' }
  | { level: 'subdivision'; countryCode: string; countryCenter: [number, number] }
  | { level: 'gallery'; countryCode: string; countryCenter: [number, number]; subdivisionId: string }

const [navStack, setNavStack] = useState<GlobeState[]>([{ level: 'world' }])
const current = navStack[navStack.length - 1]

function push(state: GlobeState) { setNavStack(s => [...s, state]) }
function back() { setNavStack(s => s.length > 1 ? s.slice(0, -1) : s) }
```

`countryCenter` is a `[lon, lat]` pair stored when the user taps a country so that Back can restore the camera position exactly.

### Derived values

```ts
const showSubdivisions = current.level === 'subdivision' || current.level === 'gallery'
const galleryOpen = current.level === 'gallery'
```

These replace the `detailLevel` prop passed to `CountryLayer` and `SubdivisionLayer`. Both layers receive `showSubdivisions: boolean` instead.

### HoverInfo

The `HoverInfo` type (currently in `CountryLayer.tsx`, imported by `SubdivisionLayer.tsx`) moves to `components/globe/types.ts` and gains new fields:

```ts
export interface HoverInfo {
  name: string
  heroPicUrl: string
  otherPicUrls: string[]   // up to 4 additional photos for the mini strip
  placeCount: number       // number of photos in this region
  screenX: number          // projected CSS pixel X
  screenY: number          // projected CSS pixel Y
}
```

`CountryLayer` and `SubdivisionLayer` import `HoverInfo` from the shared types file. Both layers already have access to the memory data needed to populate `otherPicUrls` and `placeCount` from `travelerProfile`.

`screenX` / `screenY` are computed inside a new `useProjectedPosition` hook (see §3).

---

## 2. Country Tap → Camera Tween + Subdivision Mode

### Tap handler

`CountryFeature` gains an `onClick` prop (alongside existing `onHover` / `onUnhover`). `CountryLayer` wires it up and calls `onCountryTap(countryCode, centroid)` passed down from `GlobeScene`. Tap is ignored when `showSubdivisions` is already true (prevent re-triggering).

### Centroid computation

A new utility `lib/geomath.ts` exports:

```ts
export function featureCentroid(feature: Feature): [number, number]
// Returns [lon, lat] as the arithmetic mean of the feature's coordinates.
// For MultiPolygon features, uses the largest polygon's ring.
```

This is called in `CountryLayer` when building the feature list, so the centroid is pre-computed rather than recomputed on every tap.

### Camera tween

A new hook `components/globe/useCameraFly.ts`:

```ts
export function useCameraFly(): {
  flyTo: (lonLat: [number, number], onComplete: () => void) => void
  isTweening: boolean
}
```

Internally:
- Converts `[lon, lat]` to a unit vector on the sphere
- On each `useFrame` tick, spherically interpolates (`slerp`) the camera position vector toward `targetPos * cameraDistance` over ~600ms with ease-out
- Disables `OrbitControls` during the tween via a forwarded ref (`orbitControlsRef.current.enabled = false`), re-enables on complete
- Calls `onComplete` when the tween finishes; `GlobeScene` then calls `push({ level: 'subdivision', countryCode, countryCenter })`

`GlobeScene` passes `orbitControlsRef` to both `useCameraFly` and the `<OrbitControls>` element.

---

## 3. Hover Floating Card

Replaces the current bottom-left tooltip div in `GlobeScene`.

### Position projection

A new hook `components/globe/useProjectedPosition.ts`:

```ts
export function useProjectedPosition(
  lonLat: [number, number] | null
): { screenX: number; screenY: number } | null
```

Uses `useThree()` to access the camera and `gl.domElement` size. Converts the sphere-surface point to NDC via `Vector3.project(camera)`, then maps to CSS pixel coordinates. Returns `null` when `lonLat` is null.

This hook runs inside `CountryLayer` and `SubdivisionLayer` on the hovered feature's centroid, and the result is included in the `HoverInfo` passed up to `GlobeScene`.

### FloatingCard component

New file `components/globe/FloatingCard.tsx`:

```
┌────────────────────┐
│  [hero photo]      │  120×80px, border-radius 8px
│  Region Name       │  DM Sans 14px 500 #F8FAFC
│  [▪][▪][▪][▪]      │  36×28px thumbnails, gap 4px
│  3 places visited  │  DM Sans 12px #94A3B8
└────────────────────┘
```

Props: `info: HoverInfo`. Positioned absolutely via `style={{ left: screenX + 16, top: screenY }}` with a viewport clamp:
- If `screenX + cardWidth + 16 > viewportWidth`: flip to `left: screenX - cardWidth - 16`
- If `screenY + cardHeight > viewportHeight`: shift upward by `(screenY + cardHeight - viewportHeight)`

Styling: `rgba(8,12,20,0.88)` + `backdrop-filter: blur(14px)`, `1px solid rgba(255,255,255,0.12)`, `border-radius: 14px`, `padding: 12px`. `pointer-events: none`. `z-index: 30`.

Appear/disappear: CSS transition `opacity 0→1` in `150ms ease-out`, `100ms ease-in` on leave. Implemented via a `visible` boolean that toggles after the hoverInfo changes, with a short timeout for the leave animation before unmounting.

---

## 4. Subdivision Tap → Gallery Panel

### Tap handler

`SubdivisionFeature` gains an `onClick` prop. `SubdivisionLayer` calls `onSubdivisionTap(subdivisionId)` passed from `GlobeScene`. `GlobeScene` calls `push({ level: 'gallery', ...current, subdivisionId })`.

### GalleryPanel component

New file `components/globe/GalleryPanel.tsx`. Renders when `galleryOpen` is true. Receives `subdivisionId`, `countryCode`, and `onBack: () => void`.

**Data**: looks up the matching `SubdivisionMemory` from `travelerProfile` using `subdivisionId`.

**Layout** (60vh, full width, slides up from bottom):

```
┌─────────────────────────────────────────────────┐
│  ← Back      California          8 places  [×]  │  header: 56px
├─────────────────────────────────────────────────┤
│  ← scroll →                                     │
│  [160×120] [160×120] [160×120] [160×120] ···    │  single row, horizontal scroll
│   caption    caption   caption   caption         │
└─────────────────────────────────────────────────┘
```

- Header: DM Sans 13px Back/close, Caveat 22px `#F8FAFC` name centered, place count badge
- Photo cards: `160×120px`, `border-radius: 12px`, `object-fit: cover`, bottom gradient scrim (`rgba(0,0,0,0)→rgba(0,0,0,0.6)`) with DM Sans 11px caption
- Gap: `12px`, horizontal padding: `16px`
- Background: `rgba(8,12,20,0.95)` + `blur(20px)`, `border-radius: 20px 20px 0 0`, `1px solid rgba(255,255,255,0.10)` top border

**Globe overlay**: when `galleryOpen`, the globe Canvas wrapper gets `opacity: 0.4` and `pointer-events: none` via an inline style.

**Dismiss**: Back button, `×` button, and `ESC` keydown all call `onBack` (which calls `back()`).

**Motion**:
- Enter: `transform: translateY(100%) → translateY(0)`, `320ms cubic-bezier(0.16,1,0.3,1)`
- Exit: `transform: translateY(0) → translateY(100%)`, `200ms ease-in`
- `prefers-reduced-motion`: `opacity 0→1 / 1→0` only, no translate

Motion is implemented with a `mounted` + `visible` state pair: mount on open, trigger visible on next frame for the enter animation, set visible=false then unmount after the exit duration.

---

## 5. Identity Strip

New file `components/IdentityStrip.tsx`. Rendered in `app/demo/page.tsx` as a sibling to `<GlobeScene>`, positioned `fixed top-4 left-1/2 -translate-x-1/2 z-40`.

**Content**:
```
[ ✦ beenthere ]  @Demo Traveler  ·  3 countries  ·  N places  [↗ Share]
```

- "beenthere" in Caveat 18px `#F8FAFC`
- Separator dot + username + stats in DM Sans 13px `#94A3B8`
- Country and place counts derived from `travelerProfile.countries` (countries = array length; places = sum of all `subdivisions` arrays)
- Share button: copies `window.location.href` to clipboard; label toggles to "Copied!" for 2s then reverts

**Styling**: `rgba(8,12,20,0.72)` + `blur(12px)`, `1px solid rgba(255,255,255,0.10)`, `border-radius: 9999px`, `padding: 8px 20px`, `white-space: nowrap`.

---

## 6. Earth Surface Colors

Changes confined to `EarthMesh.tsx` and the unvisited-land fill in `CountryFeature.tsx` / `SubdivisionFeature.tsx`.

| Surface | Old | New |
|---|---|---|
| Ocean (earth sphere) | `#B8C8D8` | `#0A1628` |
| Unvisited land fill | `#F0EAD6` / `#ffffff` | `#1E2D3D` |
| Unvisited land hover | `#ffffff` | `#263D52` |
| Atmosphere glow | `opacity: 0.05` | `opacity: 0.07` (slightly warmer glow on dark ocean) |

Visited country/subdivision photo fills are unchanged — they already use texture maps.

---

## 7. Fonts and Design Tokens

### Fonts

`app/layout.tsx` imports Caveat and DM Sans via `next/font/google`. Both are set as CSS variables on `<html>`:

```ts
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })
```

The `<body>` default font is DM Sans. Caveat is applied only via `font-family: var(--font-caveat)` on specific elements.

### Design tokens

Added to `app/globals.css` under `:root`:

```css
--surface: rgba(8, 12, 20, 0.82);
--border: rgba(255, 255, 255, 0.10);
--text-primary: #F8FAFC;
--text-secondary: #94A3B8;
--accent: #60A5FA;
--ring: rgba(96, 165, 250, 0.50);
```

### Loading state

`app/demo/page.tsx` wraps `<GlobeScene>` in `<Suspense fallback={<GlobeLoader />}>`. `GlobeLoader` is an inline component in the same file: full-screen `#080c14` div, centered "beenthere" in Caveat 28px `#F8FAFC`, CSS `@keyframes pulse` animating `opacity 0.4→1→0.4` at `1.5s ease-in-out infinite`.

---

## New Files

| File | Purpose |
|---|---|
| `components/globe/types.ts` | Shared `HoverInfo`, `GlobeState` types |
| `components/globe/FloatingCard.tsx` | Hover floating card |
| `components/globe/GalleryPanel.tsx` | Subdivision gallery panel |
| `components/globe/useCameraFly.ts` | Camera tween hook |
| `components/globe/useProjectedPosition.ts` | 3D → 2D screen projection hook |
| `components/IdentityStrip.tsx` | Top identity bar |
| `lib/geomath.ts` | `featureCentroid` utility |

## Modified Files

| File | Change |
|---|---|
| `app/layout.tsx` | Add Caveat + DM Sans fonts, CSS variables on `<html>` |
| `app/globals.css` | Add design token CSS custom properties |
| `app/demo/page.tsx` | Add `<Suspense>` + `GlobeLoader`, add `<IdentityStrip>` |
| `components/globe/GlobeScene.tsx` | Replace `detailLevel` with nav stack, wire all new interactions |
| `components/globe/CountryLayer.tsx` | Add `onCountryTap`, pre-compute centroids, populate full `HoverInfo` |
| `components/globe/CountryFeature.tsx` | Add `onClick` prop, update unvisited-land colors |
| `components/globe/SubdivisionLayer.tsx` | Add `onSubdivisionTap`, populate full `HoverInfo`, import from types.ts |
| `components/globe/SubdivisionFeature.tsx` | Add `onClick` prop, update unvisited-land colors |
| `components/globe/DetailToggle.tsx` | Remove — replaced by nav stack (detail level is now derived, not toggled manually) |
| `components/globe/EarthMesh.tsx` | Update ocean color |

---

## Error Handling

- `featureCentroid` returns `[0, 0]` as a safe fallback if coordinate parsing fails; the camera tween will fly to the prime meridian/equator, which is recoverable by the user.
- If `FloatingCard` thumbnail URLs fail to load, the `<img>` elements show nothing (no alt text needed for decorative thumbnails); the hero photo has `alt={name}`.
- If `GalleryPanel` cannot find the `SubdivisionMemory` for the given `subdivisionId`, it renders a minimal panel with the subdivision name and a "No photos found" message rather than crashing.
- The `DetailToggle` component is removed. Users navigate via taps; there is no manual mode switch. If a user wants to return to world mode they use Back from the subdivision level.

---

## Out of Scope

- Swipe-down gesture to dismiss gallery panel (future)
- Region shape clip mask in hover card (future)
- Photo lightbox / full-screen view from gallery
- Multiple user profiles
