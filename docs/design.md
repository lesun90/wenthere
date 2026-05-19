# Design

## Purpose

Wenthere is a single-owner travel photo album where photos are displayed on an interactive 3D globe. Visited countries and regions are covered by hero thumbnail photos instead of flat colors, and the globe is publicly shareable without login.

## Architecture

**Stack:** Next.js 14 (App Router), raw PostgreSQL via `pg`, S3-compatible object storage (MinIO in dev), Globe.gl (Three.js globe renderer), GeoJSON from Natural Earth, Nominatim for reverse geocoding, `exifr` for EXIF parsing, `jose` for JWT auth. Runs entirely in Docker; no Vercel or Supabase dependency.

### Components

- **Globe** ([components/globe/](../components/globe/)) — renders the 3D globe using Globe.gl. Operates at two zoom levels: country level (`ne_110m_admin_0_countries`) and region level (`ne_10m_admin_1_states_provinces`, fetched lazily and filtered to the selected country). Visited country polygons are raised (`altitude: 0.015`) and textured with hero thumbnails; unvisited countries use a flat sage fill (`#dde4d8`). Floating photo badge icons are rendered via `htmlElementsData` at country centroids. Handles hover tooltips, click-to-zoom camera animation, and a "← World" back button. Pointer-drag forwarding ensures globe rotation works even over HTML-layer badges.

- **Upload Pipeline** ([app/api/upload/route.ts](../app/api/upload/route.ts)) — receives multipart form data, parses EXIF GPS with `exifr`, reverse-geocodes via Nominatim, generates 400×400px JPEG thumbnails with Sharp, uploads originals and thumbnails to S3, and writes to `photos` + rebuilds `regions` in Postgres. If GPS is absent, the client sends a manually resolved `{ lat, lng }`.

- **Lightbox** ([components/lightbox/Lightbox.tsx](../components/lightbox/Lightbox.tsx)) — full-screen overlay opened when a user clicks a region. Shows the hero photo large (max 76vh), a horizontal filmstrip of all region photos, caption/date/location metadata. Arrow-key and swipe navigation. Closed via ESC or backdrop click.

- **Auth** ([lib/auth.ts](../lib/auth.ts), [middleware.ts](../middleware.ts)) — custom JWT auth using `jose`. Owner credentials (`OWNER_EMAIL`, `OWNER_PASSWORD`) are read from env vars. A 30-day HS256 session token is issued on login and stored in an `httpOnly` cookie. The middleware protects `/dashboard`, `/api/upload`, and `/api/geocode`. A single hardcoded owner account (`OWNER_ID`) is used; there is no registration flow.

### Routes

| Route | Auth | Description |
|---|---|---|
| `/[username]` | None | Public globe view |
| `/dashboard` | Required | Owner globe with upload button |
| `/login` | None | Email + password sign in |
| `/api/upload` | Required | File upload handler |
| `/api/geocode` | Required | Place name → lat/lng via Nominatim |
| `/api/auth/login` | None | Issues session cookie |
| `/api/auth/logout` | None | Clears session cookie |
| `/api/photos` | None | Returns photos for a country/region |

## Data Flow

1. Owner uploads photo(s) via the floating "Add Photos" button on `/dashboard`.
2. `/api/upload` receives the file(s), parses EXIF GPS. If GPS is found, reverse-geocodes to country/region via Nominatim. If not, the client shows the GlobePinPicker modal; the resolved `{ lat, lng }` is sent on retry.
3. API generates a 400×400px JPEG thumbnail, stores both files in S3, writes a row to `photos`, auto-sets `is_hero = TRUE` if this is the first photo in the region, and rebuilds the affected `regions` cache row(s).
4. The API response includes updated `regions` data; the client re-renders the globe immediately without a page reload.
5. Visitors load `/[username]`, fetch `regions` (single lightweight query), and render the globe. Clicking a region fetches photos from `/api/photos` and opens the lightbox.

## Key Interfaces

- `regions` table — single lightweight query to load all visited areas and their hero thumbnail paths; this is what the globe renders from.
- `is_hero` flag on `photos` — automatically set to `TRUE` for the first photo in a region. Toggling this flag swaps the hero thumbnail shown on the globe without modifying the `regions` row directly.
- `/api/geocode` — POST `{ place: string }`, returns `GeoLocation` (`lat`, `lng`, `country_code`, `country_name`, `region_code`, `region_name`). Backed by a Nominatim forward-geocode + reverse-geocode round-trip to normalize the result shape.
- `/api/upload` — POST multipart form with `files[]` and optional `lat`/`lng`/`caption`; returns `{ results, regions }` where `regions` is the full updated set.
- `GlobeRegion` ([lib/types.ts](../lib/types.ts)) — the shared type flowing from DB query → server component → globe renderer.
