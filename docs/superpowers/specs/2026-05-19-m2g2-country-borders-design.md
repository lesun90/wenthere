# M2G2 — Country Borders + Hover Highlight + Detail Toggle

**Date:** 2026-05-19
**Status:** Approved
**Milestone:** M2 — Globe UI/UX, Sub-goal G2

---

## Goal

Render all country borders as a clean line overlay on the globe, with a hover highlight and a manual toggle to switch between country-level and state/province-level borders. Done when ~195 country borders render without z-fighting, globe rotation stays smooth, hover response feels immediate, and the detail toggle switches layers cleanly.

---

## Data Assets

Natural Earth 50m used for both levels so borders align perfectly at every zoom level.

```
public/geo/
  countries-50m.json              ← Natural Earth 50m admin-0, all countries
  states-provinces-50m.json       ← Natural Earth 50m admin-1, all countries worldwide
```

Both files committed as static assets and fetched at runtime. Using the same source and resolution ensures country outlines and subdivision borders share the same coordinate space — no gaps or overlaps at borders.

---

## File Structure

```
public/geo/
  countries-50m.json
  states-provinces-50m.json

lib/
  geo.ts                          ← pure geometry utilities (no browser deps)

components/globe/
  GlobeScene.tsx                  ← owns detailLevel state; renders DetailToggle outside Canvas
  EarthMesh.tsx                   ← unchanged
  DetailToggle.tsx                ← fixed top-right pill button
  CountryLayer.tsx                ← renders country borders; dims in subdivision mode
  CountryFeature.tsx              ← border lines + fill mesh for one country
  SubdivisionLayer.tsx            ← renders subdivision borders in subdivision mode
  SubdivisionFeature.tsx          ← border lines + fill mesh for one subdivision
```

---

## Geometry Pipeline

`lib/geo.ts` exports three pure functions used by both `CountryLayer` and `SubdivisionLayer`:

**`latLngToVec3(lat, lng, radius)`**
Converts a geographic coordinate to a 3D point on the sphere using standard spherical projection.

**`featureToLineGeometry(feature, radius)`**
Iterates every ring in the GeoJSON polygon, projects each vertex to 3D at the given radius, and returns a `BufferGeometry` of line segments. Each ring is closed (last point connects back to first). Rings with fewer than 3 points are skipped.

**`featureToFillGeometry(feature, radius)`**
Triangulates the outer ring using `THREE.ShapeGeometry` (treating lng/lat as 2D x/y), then reprojects each triangulated vertex to 3D at the given radius. Rings with fewer than 3 points are skipped.

### Z-Layering

From inside to outside:

| Layer | Radius |
|---|---|
| Ocean sphere (`EarthMesh`) | 1.000 |
| Country fill mesh | 1.001 |
| Country border lines | 1.002 |
| Subdivision fill mesh | 1.003 |
| Subdivision border lines | 1.004 |

Subdivision layers sit above country layers so they read clearly when both are visible.

### Client-Side Conversion

Each layer fetches its TopoJSON file with `useEffect` + `useState`. After data arrives, a single `useMemo` runs `topojson.feature()` and the geometry functions for all features. At 50m resolution this is under 5ms per layer — imperceptible. All subsequent renders use the cached result.

`topojson-client` remains in regular dependencies (used in the browser).

---

## Detail Level Toggle

### State

`detailLevel: 'country' | 'subdivision'` lives in `GlobeScene` and is passed down as a prop to `CountryLayer` and `SubdivisionLayer`.

### `DetailToggle`

- Rendered outside `<Canvas>` as a regular DOM element
- `position: fixed`, top-right corner
- Two-state pill button: **Countries** / **Subdivisions**
- Dark semi-transparent background (`rgba(0,0,0,0.5)`), white text, subtle border
- Calls `onToggle` callback on click

### Interaction with Zoom (M2G4)

The zoom-based auto-switching from M2G4 works on top of the button state — zooming into a supported country reveals subdivision detail regardless of the button position. The button provides a manual override at any zoom level.

---

## Components

### `GlobeScene` (edit)

- Adds `detailLevel` state (`useState<'country' | 'subdivision'>('country')`)
- Renders `<DetailToggle>` as a sibling to `<Canvas>` (outside the Three.js tree)
- Passes `detailLevel` into the Canvas via a context or prop thread to `CountryLayer` and `SubdivisionLayer`

### `CountryLayer`

- Fetches `/geo/countries-50m.json` on mount
- Converts TopoJSON → GeoJSON features via `topojson.feature()`
- Runs geometry pipeline in `useMemo`
- Tracks `hoveredId: string | null`
- Renders one `<CountryFeature>` per feature
- In `subdivision` mode: reduces default border opacity to `0.15` (ghost outline)
- Renders nothing while loading; catches fetch errors silently

### `CountryFeature`

Props: `feature`, `isHovered`, `onHover`, `onUnhover`, `dimmed`

| State | Border opacity | Fill opacity |
|---|---|---|
| Default | 0.4 | 0 |
| Default (dimmed) | 0.15 | 0 |
| Hovered | 0.85 | 0.15 |

Fill mesh handles `onPointerOver` / `onPointerOut`. Material changes driven by props — no animation.

### `SubdivisionLayer`

Mirrors `CountryLayer` exactly, using `/geo/states-provinces-50m.json`. Only mounted and rendered when `detailLevel === 'subdivision'`. Lazy-fetches on first switch to subdivision mode — not loaded at initial page load.

### `SubdivisionFeature`

Mirrors `CountryFeature`. Same visual spec (border opacity 0.4 default → 0.85 hovered; fill opacity 0 → 0.15 hovered). No dimmed state needed.

---

## Visual Spec

### Country mode (default)

| Layer | Visible | Border opacity | Fill on hover |
|---|---|---|---|
| Country borders | yes | 0.4 | 0.15 |
| Subdivision borders | no | — | — |

### Subdivision mode

| Layer | Visible | Border opacity | Fill on hover |
|---|---|---|---|
| Country borders | yes (ghost) | 0.15 | — (no hover in ghost state) |
| Subdivision borders | yes | 0.4 | 0.15 |

No country name label — deferred to a later sub-goal.

---

## Error Handling

- **Fetch failure:** each layer catches its own error and renders nothing. Globe continues spinning.
- **Degenerate rings:** any polygon ring with fewer than 3 points is skipped in both geometry functions.
- **No loading state:** `EarthMesh` is always visible underneath. No spinner needed.
- **Subdivision load delay:** first switch to subdivision mode may show a brief flash of country-only borders while `states-provinces-50m.json` loads. Acceptable — no spinner added.

---

## Done When

- All ~195 country borders render without z-fighting in country mode
- Hovering a country fills it with a subtle white tint and brightens its borders
- Detail toggle button appears fixed top-right; clicking switches between modes cleanly
- Subdivision mode renders worldwide state/province borders with the same hover behavior
- Country borders dim (not disappear) in subdivision mode
- Globe rotation stays smooth in both modes
- No crash or blank state on fetch failure
