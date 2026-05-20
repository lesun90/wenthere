# M2G1 — Minimalist Shell + Spinning Globe

**Date:** 2026-05-19
**Status:** Approved
**Milestone:** M2 — Globe UI/UX, Sub-goal G1

---

## Goal

Replace the `/demo` placeholder with a full-viewport, smoothly rotating 3D globe. No country data yet. Done when the globe spins at 60 fps and controls feel responsive and natural.

---

## File Structure

```
app/demo/page.tsx              — Server Component; renders <GlobeScene />
components/globe/
  GlobeScene.tsx               — "use client"; Canvas + OrbitControls
  EarthMesh.tsx                — ocean sphere + demo island
```

`page.tsx` remains a Server Component with no client JS. The `"use client"` boundary is at `GlobeScene`, which owns the entire Three.js tree. `EarthMesh` is a plain component rendered inside the Canvas as a child of the client tree — no separate directive needed.

---

## Colors

No texture. All surfaces use `MeshStandardMaterial` with solid colors from the white palette.

| Element | Color | Notes |
|---|---|---|
| Background | `#080c14` | full-viewport, CSS only |
| Ocean sphere | `#C0C0C0` | base Earth sphere |
| Demo island | `#F5F5F5` | stand-in for land, clearly lighter |
| Atmosphere glow | `#FFFFFF` at 5% opacity | additive-blended outer sphere |
| Directional light | `#FFFFFF` | intensity 1.2, position (5, 3, 5) |
| Ambient light | `#FFFFFF` | intensity 0.3, fills shadow side |

---

## Components

### `GlobeScene`

- `"use client"`
- Renders a `<Canvas>` that fills the full viewport (`width: 100vw`, `height: 100vh`)
- Background color set on the Canvas (`#080c14`) — no separate DOM element
- Mounts `<OrbitControls>` from `@react-three/drei` with the tuning below
- Mounts `<EarthMesh />`
- Mounts ambient and directional lights

### `EarthMesh`

- **Ocean sphere:** `SphereGeometry(1, 64, 64)` with `MeshStandardMaterial({ color: '#C0C0C0' })`
- **Atmosphere glow:** `SphereGeometry(1.02, 64, 64)` with `MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.05, side: THREE.BackSide })`  — renders the inner face so the glow wraps the outside edge
- **Demo island:** `BoxGeometry(0.18, 0.04, 0.18)` with `MeshStandardMaterial({ color: '#F5F5F5' })`, positioned at lat 40°N / lng 100°E, elevated to radius + 0.02 above the sphere surface, rotated to face outward from center

---

## OrbitControls Tuning

| Setting | Value |
|---|---|
| `enableDamping` | `true` |
| `dampingFactor` | `0.05` |
| `minDistance` | `1.5` |
| `maxDistance` | `4` |
| `autoRotate` | `true` |
| `autoRotateSpeed` | `0.4` |
| Auto-rotate pause | On pointer-down (drei default) |

---

## Layout

`app/demo/page.tsx` renders a single `<main>` with `position: fixed; inset: 0; overflow: hidden` (Tailwind: `fixed inset-0 overflow-hidden`). No nav, no header, no scroll. `GlobeScene` fills this container.

---

## Done When

- Globe renders at full viewport with no overflow or scroll
- Controls respond immediately; decelerate with damping on release
- Auto-rotate kicks in on idle; pauses when the user touches the globe
- Demo island is visible as a lighter square patch on the sphere surface
- Atmosphere glow is visible as a subtle edge halo
- Stable 60 fps on a modern laptop
