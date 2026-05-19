# Lightbox

## Purpose

Full-screen photo viewer overlay opened when a user clicks a region polygon on the globe. Displays the region's hero photo large (centered, max 90vh) on a dark background, with a horizontal filmstrip of all photos in that region below. Shows caption, date taken, and region + country name. Supports arrow-key and swipe navigation between photos. Closed with ESC or by clicking outside the photo.

## Interface

- Accepts `photos` array for the selected region and `initialIndex` for which photo to show first.
- Emits `onClose()` when dismissed.
- Controlled component: parent (globe view) manages open/closed state.

## Dependencies

- Supabase Storage (thumbnail and original photo URLs)
- Touch/swipe event handling (no external library specified)

## Status

- [ ] Not started
