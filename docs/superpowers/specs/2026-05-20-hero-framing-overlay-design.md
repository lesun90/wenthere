# Hero Framing Overlay (In-Place Editor)

**Date:** 2026-05-20  
**Status:** Approved  
**Replaces:** `HeroEditorSheet` section of `2026-05-20-hero-image-selection-repositioning-design.md`

---

## Overview

Replaces the slide-up `HeroEditorSheet` (which displaced the thumbnail strip) with a `HeroFramingOverlay` that appears as an absolute-positioned layer **directly over the hero image area**. The thumbnail strip remains visible and undisturbed below. The editor occupies exactly the same space as the hero photo — no layout shift.

---

## Component: HeroFramingOverlay

Rendered as `position: absolute, inset: 0, zIndex: 20` inside the hero image container (`position: relative`). Triggered by tapping a `ShapePreviewButton`.

### Contents

- **Draggable image** — same `<img>` as the hero photo, `inset: 0`, `objectFit: cover`, transformed via DOM ref during drag (zero React renders)
- **SVG mask overlay** — `position: absolute, inset: 0, pointerEvents: none`; dims area outside shape using a mask, draws shape border stroke on top
- **Top bar** — Cancel button (left) + "Adjust framing" label (center); `position: absolute, top: 0, left: 0, right: 0`
- **Hint text** — "Drag to pan · Scroll or pinch to zoom"; `position: absolute, bottom: 0`

### Dismiss mechanisms

| Action | Result |
|--------|--------|
| Tap overlay (pointer moved < 5 px) | Stage current transform → close |
| Cancel button | Restore snapshot transform → close |

No "Apply" or "Done" button — tapping anywhere on the overlay (as long as it's not a drag) commits the transform.

### Animation

- Open: `opacity 0 → 1` over 150 ms
- Close: `opacity 1 → 0` over 100 ms; state update fires after fade completes

---

## Changes to GalleryPanel

### Removed
- `HeroEditorSheet` component and its slide-up behaviour
- Bottom-area layout branch (`editingShape !== null ? <HeroEditorSheet> : <thumbs>`)

### Added
- `HeroFramingOverlay` rendered inside the hero image `<div>` when `editingShape !== null`

### ShapePreviewButton visibility
- Hidden (`display: none`) while overlay is open — the overlay occupies the same area

### Thumbnail strip
- Unchanged; always rendered when `photos.length > 1`
- Naturally unaffected since the overlay covers only the hero image container

---

## Performance

Identical to the previous design:
- Drag updates `<img>` transform via `ref.current.style.transform` — zero React renders
- Dismiss triggers one `setState` call to commit or revert the staged transform
- SVG shape path computed once via `useLayoutEffect` after mount
