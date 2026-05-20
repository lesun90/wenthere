# Beenthere — UX/UI Proposal

## What It Is

A full-screen 3D travel-photo globe. The globe *is* the product — no landing page, no sidebar navigation. Every UI element is a floating layer over the globe. This constrains and guides every design decision below.

---

## Design System

| Token | Value | Rationale |
|---|---|---|
| `--bg` | `#080c14` (keep) | Deep space feel; photos pop against it |
| `--surface` | `rgba(8,12,20,0.82)` | Panels float above globe, stay readable |
| `--border` | `rgba(255,255,255,0.10)` | Gossamer lines; don't compete with earth |
| `--text-primary` | `#F8FAFC` | Max contrast on dark surface |
| `--text-secondary` | `#94A3B8` | Labels, captions, metadata |
| `--accent` | `#60A5FA` | Sky blue — naturally geographic |
| `--ring` | `rgba(96,165,250,0.50)` | Focus outline |
| Heading font | **Caveat** (script) | Handwritten — feels like a travel journal |
| Body / UI font | **DM Sans** | Clean, readable at small sizes on dark backgrounds |
| Corner radius | `12px` panels, `9999px` pills | Soft without being childish |
| Blur | `backdrop-filter: blur(12px)` | Glass layering language |

> **Why DM Sans instead of Quicksand?** At 12–14px on a dark surface with blur, DM Sans has tighter ink traps and better renders at small sizes. Quicksand is better for light backgrounds at larger sizes.

---

## Screen Layout

**Default — world view**
```
┌──────────────────────────────────────────────────────────┐
│  [✦ beenthere]  @username · 12 countries        [Share]  │  ← Identity Strip
│                                                          │
│                    ·  GLOBE  ·                           │
│               (hover region → floating frame)            │
│                                                          │
│  [World ↔ Detail]                                        │
└──────────────────────────────────────────────────────────┘
```

**Hover on any visited region (country or subdivision)**
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│           ┌──────────────────────┐                       │
│           │  ╔══════════════╗    │  ← fixed-size frame  │
│           │  ║ region shape ║    │    (same bbox always) │
│           │  ║  filled with ║    │                       │
│           │  ║    photo     ║    │                       │
│           │  ╚══════════════╝    │                       │
│           │  ┌──┐ ┌──┐ ┌──┐     │  ← mini gallery bar  │
│           │  └──┘ └──┘ └──┘     │                       │
│           │  3 places visited    │  ← place count text  │
│           └──────────────────────┘                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Tap/click country → rotate + subdivision mode**
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│         · GLOBE rotates to center country ·              │
│         · auto-switches to subdivision mode ·            │
│         · visited subdivisions appear                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Tap/click subdivision → gallery panel slides up**
```
┌──────────────────────────────────────────────────────────┐
│              · GLOBE · (dimmed, stays interactive)       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  ← Back          California          8 places  [×] │  │  ← Gallery Panel
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐           │  │
│  │  │ photo│  │ photo│  │ photo│  │ photo│  ···       │  │
│  │  └──────┘  └──────┘  └──────┘  └──────┘           │  │
│  │  San Francisco · LA · Yosemite · Big Sur · ···     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Component-by-Component Recommendations

### 1. Identity Strip (top bar — not yet built)

A slim, pill-shaped strip floating top-center:

```
[ ✦ beenthere ]   @jake  ·  12 countries  ·  34 places        [↗ Share]
```

- Glass background: `rgba(8,12,20,0.72)` + `blur(12px)`
- "beenthere" in **Caveat 18px** (the only place to use the script font in navigation chrome)
- Username and stats in **DM Sans 13px** `#94A3B8`
- Share button: bordered pill with hover fill — not a solid CTA (the globe should stay primary)
- Stays at `z-index: 40`; hides behind an open gallery panel

### 2. Hover Floating Frame (replaces current tooltip)

When hovering any visited region — whether a country in world mode or a subdivision in detail mode — a floating frame appears near the cursor. This replaces the current bottom-left tooltip.

**Frame anatomy (top to bottom):**
1. **Region shape preview** — the actual geographic shape of the region, clipped and filled with its hero photo. The outer frame has a fixed bounding box (e.g. `200×180px`) regardless of how large or small the region is on the globe. Small regions (Rhode Island, a tiny province) get the same frame size as large ones (Texas, Xinjiang) — the shape just scales to fit inside it.
2. **Mini gallery bar** — a horizontal strip of `40×30px` thumbnail chips below the shape, showing other photos from that region (up to ~4–5). Horizontally scrollable if more exist.
3. **Place count** — one line below the bar: `"3 places visited"` in **DM Sans 12px** `#94A3B8`

**Positioning:**
- Floats near the hovered region's centroid, not fixed to a corner
- Stays fully within viewport; flips side if near an edge
- `pointer-events: none` — never blocks globe interaction
- Fade in `opacity 0→1` in `150ms ease-out`; fade out in `100ms` on mouse-leave
- `z-index: 30`

**Visual:**
- Background: `rgba(8,12,20,0.88)` + `blur(14px)`
- Border: `1px solid rgba(255,255,255,0.12)`
- Corner radius: `14px`
- Padding: `12px`

### 3. Detail Toggle (top-right pill — already exists)

Current design is good. One UX improvement:
- Replace text "Countries / Subdivisions" with something shorter: **"World / Detail"** or icon-based (globe icon / zoom-in icon from Lucide)
- Add a `title` attribute for screen readers
- Add `aria-pressed` to each button — they're semantically toggle buttons

### 4. Interaction Flow

#### Tap/click a country (world mode)
1. Globe smoothly rotates to bring the country to center view (`300ms ease-out` camera tween)
2. Automatically switches to subdivision mode — visited subdivisions within that country become visible
3. No panel opens yet; the user is now exploring that country's regions on the globe
4. Hover floating frame (§2) works on individual subdivisions from this point

#### Tap/click a subdivision (subdivision mode)
1. Globe dims to `opacity 0.4` — it stays visible and interactive behind the panel
2. Gallery panel slides up from the bottom (`50–65%` viewport height)
3. Panel content is scoped to that subdivision

#### Gallery Panel spec

- **Header**: `← Back` (left), subdivision name in **Caveat 22px** (center), place count badge + `×` close (right)
- **Photo grid**: 2-column masonry or horizontal scroll strip with `160×120px` cards
- **Cards**: photo fill + caption in bottom gradient scrim, `border-radius: 12px`
- **Selected state**: `ring-2 ring-[#60A5FA]` border on the active card
- **Close behavior**: swipe-down gesture on mobile; `ESC` on desktop; `×` button; or tap anywhere on the dimmed globe behind
- **Globe stays interactive**: while panel is open the user can still tap another subdivision on the globe to switch the panel's content without closing it first

Motion spec:
- Enter: `translateY(100%) → translateY(0)` in `320ms cubic-bezier(0.16,1,0.3,1)` (spring feel)
- Exit: `200ms ease-in` (exit faster than enter)
- Respect `prefers-reduced-motion`: skip translate, use opacity-only fade instead

### 5. Earth Surface Color

The current `#B8C8D8` base is a good neutral. For unvisited countries vs ocean, consider:
- Ocean: `#0A1628` (deep navy, darker than globe base)
- Unvisited land: `#1E2D3D` (slate, not black — subtle separation from ocean)
- Visited country glow: thin `1px` border in `rgba(96,165,250,0.3)` on hover

### 6. Loading State

When a photo texture is loading (or the initial scene is loading), show:
- Full-screen `#080c14` background
- Centered **Caveat** wordmark "beenthere" with a subtle fade-pulse `1.5s ease-in-out infinite`
- No spinner — the wordmark itself is the loading indicator
- Once globe renders, crossfade in `400ms`

---

## Typography Scale

| Use | Font | Size | Weight | Color |
|---|---|---|---|---|
| App wordmark | Caveat | 20px | 600 | `#F8FAFC` |
| Country/region name (panel header) | Caveat | 22px | 600 | `#F8FAFC` |
| Hover frame place count | DM Sans | 12px | 400 | `#94A3B8` |
| Caption / subtext | DM Sans | 12px | 400 | `#94A3B8` |
| Toggle buttons | DM Sans | 13px | 500 | `#F8FAFC` / `rgba(255,255,255,0.45)` |
| Photo caption in gallery | DM Sans | 12px | 400 | `#E2E8F0` |
| Stats (country count etc.) | DM Sans | 13px | 400 | `#94A3B8` |

Load both fonts via `next/font/google` (not a CDN `@import`) to avoid layout shift.

---

## Accessibility Checklist

- [ ] All interactive floating elements have `aria-label` (the globe canvas, toggle buttons, back button)
- [ ] Gallery panel traps focus when open; restores focus to triggering element on close
- [ ] Hover tooltip content is also announced via `aria-live="polite"` region for screen readers
- [ ] Color contrast on all text: `#F8FAFC` on `rgba(8,12,20,0.82)` → well above 7:1
- [ ] `prefers-reduced-motion`: globe auto-rotation stops; gallery panel uses opacity-only transition
- [ ] All buttons have ≥44×44px hit area
- [ ] `<canvas>` element has `role="img"` and descriptive `aria-label`

---

## Immediate Priorities (in order)

1. **Fonts**: Add Caveat + DM Sans via `next/font`, apply to `layout.tsx`
2. **Identity strip**: Build the floating profile header (most visible upgrade)
3. **Hover floating frame**: Replace current tooltip with region-shape preview + mini gallery bar + place count
4. **Country tap → rotate + subdivisions**: Camera tween to center country, auto-switch to subdivision mode
5. **Subdivision tap → gallery panel**: Slides up, globe dims but stays interactive
6. **Earth surface colors**: Distinguish ocean vs unvisited land vs visited
7. **Loading state**: Wordmark pulse before globe renders
