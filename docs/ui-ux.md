# WentThere — UI/UX Design Document

## Overview

WentThere is a travel memory viewer built around an interactive 3D globe. The visual language is **cinematic glassmorphism** — dark by default, with frosted-glass surfaces layered over the globe, spatial animations, and a strong separation between the immersive background (the globe) and the foreground UI (panels, cards, strips).

---

## Design Principles

1. **Globe first.** Every UI element is transparent or semi-transparent so the globe remains the focal point. Nothing is opaque unless it must be.
2. **Spatial continuity.** Animations communicate position in the hierarchy — panels bloom from the tap point, lightboxes scale from their trigger, exits are faster than entrances.
3. **Two modes, one language.** Dark and light themes share the same glassmorphism style; only the opacity and base colors shift. No component is designed for one theme only.
4. **No decorative motion.** Every animation has a cause-effect relationship — it communicates what just happened, not just that something happened.

---

## Color System

Tokens are defined in `globals.css` as CSS custom properties on `:root` (dark) and `.light`.

### Dark Theme (default)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#080c14` | Page background |
| `--surface` | `rgba(8,12,20,0.82)` | Glass surfaces |
| `--surface-panel` | `rgba(8,12,20,0.95)` | Opaque panels |
| `--border` | `rgba(255,255,255,0.10)` | Hairline borders |
| `--divider` | `rgba(255,255,255,0.06)` | Section dividers |
| `--text-primary` | `#F8FAFC` | Headlines, names |
| `--text-secondary` | `#94A3B8` | Labels, captions |
| `--text-muted` | `rgba(255,255,255,0.20)` | Separators, dots |
| `--accent` | `#60A5FA` | Interactive highlights |
| `--ring` | `rgba(96,165,250,0.50)` | Focus rings |

### Light Theme

| Token | Value | Role |
|---|---|---|
| `--bg` | `#FFFFFF` | Page background |
| `--surface` | `rgba(255,255,255,0.85)` | Glass surfaces |
| `--text-primary` | `#0C1525` | Headlines |
| `--text-secondary` | `#64748B` | Labels |
| `--accent` | `#3B82F6` | Interactive highlights |

### Functional colors (hardcoded, not tokenized)

- **Hero star / badge:** `rgba(251,191,36,0.88)` amber, border `rgba(250,204,21,0.70)` — used only for the hero designation affordance.
- **Caption text on images:** `#F8FAFC` with `text-shadow: 0 1px 4px rgba(0,0,0,0.44)` — always on dark gradients, regardless of theme.

---

## Typography

Two fonts, loaded via `next/font/google` with `display: swap`.

| Font | Variable | Role |
|---|---|---|
| **Caveat** | `--font-caveat` | Place names, brand wordmark — handwritten feel reinforces the travel journal tone |
| **DM Sans** | `--font-dm-sans` | All UI text — labels, captions, counts, buttons |

### Scale

| Use | Size | Weight |
|---|---|---|
| Brand wordmark | 18px | 600 |
| Place name (gallery header) | 22px | 600 (Caveat) |
| Place name (floating card) | 22px | 700 (DM Sans) |
| Photo caption | 13–14px | 500 |
| Labels / counts | 11–13px | 400–500 |
| Badge text | 11px | 500–600, letter-spacing 0.04–0.08em |

---

## Glassmorphism System

All glass surfaces use the same pattern: translucent background + `backdrop-filter: blur()` + hairline border + inset highlight.

### Recipe

```css
background: linear-gradient(170deg,
  rgba(255,255,255,0.11) 0%,   /* top-left light catch */
  rgba(255,255,255,0.04) 35%,  /* mid fade */
  rgba(8,12,20,0.58) 100%      /* dark base */
);
border: 1px solid rgba(255,255,255,0.18);
backdrop-filter: blur(36px) saturate(180%);
box-shadow: 0 -12px 48px rgba(0,0,0,0.40),
            inset 0 1px 0 rgba(255,255,255,0.11); /* top-edge shimmer */
```

### Blur values by surface elevation

| Surface | Blur | Saturation | Role |
|---|---|---|---|
| Identity strip | 12px | — | Lowest: always visible, minimal distortion |
| Floating card | 18px | — | Hover tooltip |
| Gallery panel | 36px + saturate(180%) | High | Bottom sheet |
| Lightbox overlay | 40px + saturate(140%) | Medium | Full-screen scrim |
| Lightbox card | 24px | — | Content card within overlay |

### Shimmer overlay

Every glassmorphic card also has a top-left shine layer (simulates ambient light source):
```css
background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 45%);
pointer-events: none;
```

---

## Component Inventory

### Identity Strip

Fixed pill at top-center. Always visible. Shows: brand name · traveler name · country count · place count · Share button · Theme toggle.

- **Position:** `fixed, top: 16px, left: 50%, transform: translateX(-50%)`
- **Z-index:** 40
- **Blur:** 12px
- **Shape:** `border-radius: 9999px` (full pill)
- **Theme toggle:** SVG sun/moon icon, no text label (aria-label provided)
- **Share button:** copies URL to clipboard, transitions to "Copied!" state for 2s

### Globe (3D)

Three.js canvas filling the entire viewport. Dimmed to `opacity: 0.4` when the gallery panel is open, with a `300ms` opacity transition.

A transparent backdrop div (`z-index: 40`, `inset: 0`) is rendered behind the gallery panel when open — clicking it closes the gallery.

**Interaction levels:**
1. **World view** — countries are highlighted on hover, tapped to fly-to
2. **Detail view** — zoom in triggers subdivision layer; subdivisions highlight on hover
3. **Gallery view** — subdivision tapped; globe dimmed, gallery panel appears

### Floating Card

Appears on hover over a visited subdivision. Follows the mouse. Contains the region shape (SVG, image-clipped), region name, place count, and a stack of circular photo thumbnails.

- **Position:** absolute, offset from cursor with viewport clamping (never clips off-screen)
- **pointer-events:** none (never blocks globe interaction)
- **Enter:** `opacity 150ms ease-out`
- **Exit:** `opacity 100ms ease-in`
- **Z-index:** 30

### Gallery Panel

Bottom sheet. Opens when a visited subdivision is tapped. 72vh tall, rounded top corners (24px radius).

**Layout (flex column):**
```
┌──────────────────────────────────┐
│  ████ drag handle pill ████      │  10px
├──────────────────────────────────┤
│  [← Back]   Place Name  [×]     │  ~56px header
│              N memories          │
├──────────────────────────────────┤
│                                  │
│  ┌──────────────────────────┐   │
│  │  Hero image (contain)    │   │  flex:1
│  │  ⛶ expand   1/N counter │   │
│  │  Caption gradient overlay│   │
│  └──────────────────────────┘   │
├──────────────────────────────────┤
│  [img][★🌐] [img][★🌐] [img][★🌐]│  thumbnail strip
└──────────────────────────────────┘
```

**Animation:** Blooms from the tap point using dynamic `transform-origin` computed from the click coordinates. Scale `0.72 → 1` with `cubic-bezier(0.16,1,0.3,1)` over 340ms. Exit: scale `1 → 0.85` over 200ms.

**Hero image:** `objectFit: contain` — full photo at natural aspect ratio with a dark letterbox background. Switches between photos with a `@keyframes gallery-hero-fade` (opacity 0.55→1, scale 1.012→1) triggered by React key remount.

**Dismiss:** Back button, × button, clicking the backdrop behind the panel, or `Escape` key.

#### Thumbnail Strip

Horizontal scroll row. Each item is a **flex column** (image on top, hero action buttons below — no overlap, no z-index needed):

```
┌──────────┐   ← 96×66, div[role=button], objectFit:cover
│  image   │     box-shadow ring when selected
└──────────┘
  [★][🌐]      ← two 22×22 buttons, separate row
```

- **Selected state:** `scale(1.05)`, `box-shadow: 0 0 0 2.5px rgba(255,255,255,0.82)`
- **Non-selected:** `box-shadow: 0 0 0 1px rgba(255,255,255,0.13)`
- **Scrollbar:** hidden via `scrollbarWidth: none` + `::-webkit-scrollbar { display: none }`
- **Auto-scroll:** selected thumbnail scrolls into view with `scrollIntoView({ behavior: 'smooth', inline: 'center' })`

#### Hero Buttons

Marks which photo is the cover/hero for the region or country. The gallery initializes from `memory.heroPic`, the seed country hero, or the current in-memory overrides, then reports changes back to `GlobeScene` on gallery close so the gallery, hover card, country fill, and subdivision texture use the same hero URLs. Clicking the region star also selects that thumbnail so the newly marked region hero immediately appears in the large display.

- **Region unset:** dark glass pill, outline white star
- **Region set:** amber background `rgba(251,191,36,0.88)`, filled white star, amber border
- **Country unset:** dark glass pill, white globe outline
- **Country set:** blue background `rgba(96,165,250,0.88)`, white globe outline, blue border

#### Hero Framing

When the currently displayed photo is the region hero and/or country hero, small shape-clipped preview buttons appear in the lower-right corner of the hero image. Region framing uses the subdivision geometry; country framing uses the country geometry. Tapping a preview opens the in-place `HeroFramingOverlay` over the hero image area.

- The photo remains fixed while the geographic frame moves and scales over it.
- Drag moves the frame, scroll/pinch resizes it, and tap applies the staged transform.
- Cancel closes the overlay without staging the edit.
- The thumbnail strip remains visible while the overlay is open.

### Lightbox

Full-screen overlay. Opens when the hero image is clicked.

- **Overlay:** `position: fixed, inset: 0, z-index: 200`, `backdrop-filter: blur(40px)`
- **Card:** `max-width: min(90vw, 900px)`, `border-radius: 20px`, glassmorphic
- **Enter:** card scales `0.88 → 1` + `translateY(20px → 0)` over 300ms
- **Exit:** 180ms reverse
- **Navigation:** prev `‹` / next `›` pill buttons at vertical center; keyboard `←` `→`
- **Counter:** `N / M` pill centered at top
- **Dismiss:** click overlay, `×` button, or `Escape`

---

## Animation System

All animations use `transform` and `opacity` only — no layout properties.

| Animation | Duration | Easing | Notes |
|---|---|---|---|
| Panel enter | 340ms | `cubic-bezier(0.16,1,0.3,1)` | Spring-feel overshoot |
| Panel exit | 200ms | `cubic-bezier(0.4,0,1,1)` | Fast ease-in |
| Lightbox enter | 300ms | `cubic-bezier(0.16,1,0.3,1)` | Scale + translateY |
| Lightbox exit | 180ms | `ease` | ~60% of enter duration |
| Floating card enter | 150ms | `ease-out` | Opacity only |
| Floating card exit | 100ms | `ease-in` | |
| Hero image switch | 220ms | `cubic-bezier(0.16,1,0.3,1)` | `@keyframes` fade + micro-scale |
| Thumbnail select | 200ms | `cubic-bezier(0.16,1,0.3,1)` | Scale + box-shadow |
| Button hover | 150ms | `ease` | Background + color |
| Globe dim | 300ms | `ease` | Opacity 1 → 0.4 |

`prefers-reduced-motion` is checked on mount; when active, all transform animations are disabled and only opacity transitions remain.

---

## Z-Index Scale

| Layer | Z-index | Element |
|---|---|---|
| Globe canvas | — (base) | Three.js canvas |
| Floating card | 30 | Hover tooltip |
| Identity strip / backdrop | 40 | Fixed pill nav; gallery backdrop |
| Gallery panel | 50 | Bottom sheet |
| Lightbox | 200 | Full-screen photo viewer |

---

## Theme Switching

Theme state lives in `ThemeProvider` (`lib/theme-context.tsx`), persisted to `localStorage` under the key `'theme'`.

An inline script in `<head>` reads `localStorage` before first paint and adds the `.light` class to `<html>` if needed — prevents the dark→light flash on page reload.

All component-level dark/light switching is handled entirely in CSS via the `.light` ancestor selector (e.g. `.light .gallery-panel { ... }`). No conditional class logic in component JSX.

---

## Accessibility Notes

- All icon-only buttons have `aria-label`
- Theme toggle has `aria-label` reflecting current state ("Switch to light mode")
- Lightbox has `role="dialog"` and `aria-modal="true"`
- Thumbnail items use `role="button"`, `tabIndex={0}`, `aria-pressed`, and `onKeyDown` for Enter/Space
- Star buttons have `aria-label` and `title` reflecting current state
- `Escape` key closes both the gallery panel and the lightbox
- Arrow keys navigate photos within the lightbox
- `prefers-reduced-motion` disables transform animations globally
