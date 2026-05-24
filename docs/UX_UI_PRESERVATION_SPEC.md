# UX/UI Preservation Spec

Purpose: give future feature work, updates, bug fixes, and refactors a concrete
baseline for the Beenthere UX/UI. Use this document to understand the current
experience, decide what a change is allowed to alter, and catch accidental
regressions.

This is a living baseline, not a freeze. New UI features may intentionally
change these details when the change improves the product. When you do that,
name the intended UX change, update this spec if the new behavior should become
the baseline, and add or adjust tests for the behavior that now matters.

Read the words in this doc this way:

- **Should** means preserve by default. You may change it with a clear product
  reason.
- **Needs to** means protect it unless the feature explicitly replaces that
  behavior.
- **Current baseline** means the app behaves this way today; use it as a
  reference, not a permanent constraint.
- **Avoid** means the pattern has caused problems or conflicts with the current
  experience. You can still choose it for a new direction, but document why.

## Product Experience

Beenthere is a first-screen, interactive travel-photo globe. The primary
experience is not a dashboard, landing page, or map table. The globe is the
product surface.

The intended feeling is:

- cinematic, spatial, and photo-forward
- quiet and premium, with glassy overlays rather than heavy panels
- exploratory, with direct manipulation of the globe
- personal, using traveler photos as country and region texture fills
- lightweight, avoiding explanatory UI text unless needed for an action

New features should preserve the first impression: on load, the user sees the
globe as the main object, with only compact controls layered above it.

## Source of Truth

### Profile Data

The saved `TravelerProfile` is the source of truth for:

- photos
- captions
- country and subdivision locations
- presentation heroes
- hero framing transforms

Derived profile indexes may cache or summarize this data, but should not become
independent sources of truth.

### Live UI Overrides

Live hero overrides and transforms may temporarily shadow saved presentation
state during the current session. They should follow this precedence unless a
feature explicitly changes hero ownership:

1. live override
2. saved presentation summary
3. first valid photo fallback

Country and region heroes are independent. Setting a region hero should not
require a country hero to resolve from the same region. Setting a country hero
should not overwrite the region hero.

### Consistency Surfaces

The following surfaces should agree for the same place:

- globe mesh photo texture
- hover card shaped preview
- gallery selected hero state
- framing editor preview
- saved profile presentation
- post-reload rendering

If a feature changes hero, photo, or framing behavior, add a test or manual
verification note proving the affected surfaces remain intentionally consistent.

## First Screen Layout

The main app route should render the usable globe experience immediately. Avoid
replacing it with marketing copy, a landing page, onboarding text, or a large
instruction panel unless the product direction changes and this spec is updated.

Current baseline first-screen elements:

- full-viewport globe canvas
- compact identity strip fixed near the top center
- optional hover card near pointer
- optional photo management drawer when opened
- optional gallery bottom sheet when a region is selected

The app shell should remain `fixed inset-0 overflow-hidden` or equivalent so the
globe is a contained, immersive viewport experience.

## Identity Strip Contract

The identity strip is the top-level brand and action surface.

Current baseline content order:

1. `beenthere` wordmark
2. traveler name
3. country count
4. place count
5. Manage gallery action, when editable
6. Share action
7. theme toggle

Current baseline behavior:

- fixed near top center, currently `top: 16px`
- horizontally centered when drawer is closed
- shifts left by half the drawer width when drawer is open
- uses a pill silhouette with backdrop blur
- stays compact; avoid turning it into a large navigation bar unless redesigning
  the app shell
- share feedback changes label to `Copied!` for about 2 seconds
- theme toggle needs an accessible label

Visual constraints:

- wordmark uses the handwriting/display font
- metadata uses the sans font at compact size
- separators are subtle middle dots
- buttons are low-emphasis pill controls

## Globe Interaction Contract

The globe should remain directly manipulable.

Current baseline behavior:

- orbit controls support rotation and zoom
- country tap from world level flies toward that country
- after fly completes, app enters subdivision/detail context
- zooming near enough enters detail mode
- zooming out exits detail mode
- region tap opens the gallery panel
- pointer hover shows a floating card only when interactions are enabled
- drag/orbit suppresses hover so cards do not flicker while manipulating

Current motion constants are part of the feel:

- fly duration: about `700ms`
- mode layer transition: about `300ms`
- world rotate speed: about `1`
- detail rotate speed: about `0.35`
- zoom speed: about `0.65`

Any change to these values should be intentional and checked visually on desktop
and small screens.

## Globe Rendering Contract

The globe is photo-forward. Visited countries and subdivisions should display
traveler photo textures, not plain category colors, whenever valid photos exist.

Current baseline rendering rules:

- world mode emphasizes country photos
- detail mode fades country photos and shows subdivision photos
- countries and subdivisions use separate layers
- region mesh and hover preview should use the same effective hero transform
- saved hero transforms should apply after reload, not only during the live edit
  session
- missing or failed images may fall back to a neutral fallback color
- borders need to remain visible enough to read geography
- dark and light themes should both preserve photo legibility

Avoid decorative backgrounds, non-geographic image overlays, or UI cards that
compete with the globe unless the feature is intentionally redesigning the main
visual hierarchy.

## Floating Card Contract

Hover cards are quick previews, not persistent detail panels.

Current baseline behavior:

- appears near the pointer
- follows pointer movement using transform updates
- clamps inside the viewport with at least a small margin
- fades in/out quickly
- has `pointer-events: none`
- disappears when gallery opens, controls are active, or hover clears

Current baseline content:

- shaped place preview clipped to country/region geometry when geometry exists
- place name
- visited count text
- up to three small circular photo thumbnails

Visual constraints:

- width about `286px`
- glassy surface with blur and subtle border
- no large explanatory text
- shaped image stroke needs to remain visible on dark and light themes

## Gallery Panel Contract

The gallery panel is a bottom sheet opened from a region.

Current baseline behavior:

- enters from the bottom as a rounded sheet
- height is about `72vh`
- globe dims behind it
- back/close both dismiss the panel
- `Escape` closes the gallery when lightbox is not open
- selected thumbnail scrolls into view
- clicking main image opens lightbox unless framing editor is active
- hero changes are staged locally and committed on close
- country and region hero commits are independent

Current baseline content:

- drag handle
- back button
- region name
- memory count
- close button
- large selected photo
- caption overlay
- photo count badge when multiple photos exist
- hero action buttons per thumbnail
- framing adjust buttons only for active heroes
- horizontal thumbnail rail

Visual constraints:

- panel uses high blur/saturation glass surface
- top corners are rounded; bottom edge attaches to viewport
- main image uses contained presentation in the gallery hero area
- thumbnails are fixed-size and should not shift layout on selection
- active region hero uses the warm/star treatment
- active country hero uses the blue/globe treatment

## Hero Framing Editor Contract

The framing editor lets users align a photo inside a country or region shape.

Current baseline behavior:

- appears over the selected gallery photo
- shows dimmed background image and a shaped mask preview
- drag moves the shape frame in real time
- wheel or pinch resizes the frame
- tap/click applies the framing
- cancel exits without committing
- two-finger gestures should not accidentally apply after pinch end

Current baseline transform contract:

- keep `x`, `y`, and `scale` for reopening the editor
- store explicit texture UV transform values for globe rendering when available
- shaped hover preview and globe texture rendering should use compatible framing
- saved framing should survive reload

Scale constraints:

- minimum shape scale: about `0.2`
- maximum shape scale: about `3.0`

## Lightbox Contract

The lightbox is for inspecting a photo, not editing.

Current baseline behavior:

- opens as a fixed modal overlay above the app
- closes on overlay click, close button, or `Escape`
- left/right arrows navigate photos when available
- keyboard arrows navigate when available
- active image is centered and constrained to viewport

Visual constraints:

- dark translucent overlay with strong blur
- card max width about `900px`
- card max height about `700px`
- close and nav controls are glass buttons
- caption sits over a bottom gradient

## Photo Management Drawer Contract

The drawer is the editing/import surface. It should not replace the globe as the
primary experience unless the product intentionally moves toward a management
mode.

Current baseline behavior:

- slides in from the right
- width about `380px`
- opening the drawer shifts the globe left by half drawer width
- identity strip shifts with the globe
- drawer close returns globe and identity strip to centered layout
- import/drop zone supports click and drag affordances
- pending imported photo opens into edit flow
- location suggestion input supports keyboard navigation
- selecting a `Country - Region` suggestion updates both country and region
  fields
- country field becomes read-only when a region determines the country

Visual constraints:

- glass panel with right-side ownership
- dense but readable photo management layout
- no oversized marketing copy
- form labels are compact uppercase labels
- inputs use existing `photo-edit-input` styling

## Theme Contract

Both light and dark themes are first-class.

Current baseline tokens:

- `--bg`
- `--surface`
- `--surface-panel`
- `--border`
- `--divider`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--accent`
- `--ring`
- `--scrollbar`
- `--card-shape-stroke`

UI code should prefer semantic CSS variables over raw colors when the color is
part of the app chrome. Raw colors are acceptable for fixed photographic
overlays, SVG internals, or one-off effects that need to remain independent of
theme.

Dark theme is the current default. Changing the default theme is a product
decision, not a cleanup/refactor detail.

## Motion Contract

Motion should communicate spatial continuity.

Current baseline motion patterns:

- globe fly animation for country drill-in
- bottom-sheet scale/fade entrance from tap origin when available
- drawer slide with matched globe/identity shift
- hover card fade
- gallery hero image crossfade/scale on selected image change
- lightbox scale/fade entrance

Timing guidance:

- micro hover/feedback: `100ms` to `180ms`
- image switch: about `220ms`
- drawer and gallery entrance: about `300ms` to `340ms`
- gallery exit: about `200ms`
- fly-to-country: about `700ms`

Reduced motion should remove nonessential transitions where supported. Avoid
large decorative animation that does not map to a user action unless the feature
is specifically about visual expression.

## Responsive Contract

The interface is viewport-first, not page-scroll-first.

Current baseline behavior:

- no horizontal page scroll
- no body scroll during main globe experience
- fixed controls should remain within viewport on mobile and desktop
- hover-only affordances need click/tap equivalents where relevant
- text in pills, buttons, cards, and headers should not overflow its container
- gallery and drawer should preserve access to close/back actions on small
  screens

## Accessibility Contract

Current baseline accessibility requirements:

- icon-only buttons need `aria-label`
- modal/lightbox needs `role="dialog"` and `aria-modal="true"`
- interactive photo thumbnails need keyboard activation
- suggestion list uses listbox/option semantics
- images need meaningful alt text when content-bearing, empty alt when purely
  decorative
- visible focus states should not be removed
- functional color differences need icon, label, shape, or title support

Avoid adding interactions that rely on hover only.

## New Feature and Refactor Checklist

Before coding:

- [ ] Name the user-visible behavior being added or preserved.
- [ ] Identify the source of truth for any state touched.
- [ ] List all UI surfaces that should stay consistent.
- [ ] Decide whether a contract test is needed before implementation.

During coding:

- [ ] Use existing components, tokens, and motion timings before inventing new
  ones.
- [ ] Keep the globe as the first-screen primary surface.
- [ ] Avoid duplicating derived UI logic across preview, saved state, and final
  render paths.
- [ ] Keep country and region behavior independent unless the feature explicitly
  says otherwise.

Before commit:

- [ ] Check fresh load and post-reload behavior.
- [ ] Check fast repeated actions if the change touches async saves or staged UI.
- [ ] Check dark and light themes when chrome or text color changed.
- [ ] Check desktop and a narrow/mobile viewport for overlap and clipping.
- [ ] Run focused tests plus the app build/typecheck.

Recommended verification for this repo:

```bash
pnpm --filter @beenthere/ui test
pnpm --filter @beenthere/web test
pnpm --filter @beenthere/web build
```

## Change With Care

These patterns can be valid for a deliberate redesign, but they should not slip
in during routine feature work or refactors:

- replace the globe with a landing page or explanatory first screen
- make the identity strip into a large navigation/header bar
- add nested cards or card-heavy sections over the globe
- add decorative blobs, orbs, or unrelated background graphics
- make hover preview, gallery preview, and globe render use different hero logic
- make region hero actions depend on country hero state
- add new state owners without documenting precedence
- let profile save order depend on async timing
- add controls without labels or keyboard access
- change animation timings casually during unrelated refactors
- reformat large UI files in the same commit as behavior changes

## Ownership Map

Use these files as the primary reference points:

- `apps/web/app/ProfileExperience.tsx`: app composition, profile provider,
  globe, and profile UI wiring
- `apps/web/app/globals.css`: theme tokens and global chrome styles
- `packages/ui/components/IdentityStrip.tsx`: top identity/action strip
- `packages/ui/components/ProfileUI.tsx`: identity strip plus photo drawer
  composition
- `packages/ui/components/globe/GlobeScene.tsx`: navigation stack, globe mode,
  hero overrides, camera behavior, drawer/gallery coordination
- `packages/ui/components/globe/CountryLayer.tsx`: country texture layer and
  country hover/tap behavior
- `packages/ui/components/globe/SubdivisionLayer.tsx`: region texture layer and
  region hover/tap behavior
- `packages/ui/components/globe/FloatingCard.tsx`: hover preview contract
- `packages/ui/components/globe/GalleryPanel.tsx`: region gallery, lightbox,
  hero selection, and framing editor
- `packages/ui/components/globe/PhotoManagementDrawer.tsx`: import, edit, and
  location assignment UX
- `packages/ui/components/profile/ProfileProvider.tsx`: profile persistence and
  mutation orchestration
- `packages/ui/lib/geodata.ts`: profile indexing and hero summary derivation
- `packages/ui/lib/profile-store/mutations.ts`: profile mutation helpers
