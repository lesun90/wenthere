<!-- Original spec: 2026-05-18-globe-photo-album-design.md -->

# Wenthere -- Design Spec
**Date:** 2026-05-18
**Status:** Approved

---

## Overview

A web-based multi-user photo album where each user's travel photos are displayed on an interactive 3D globe. Visited countries and regions are covered by hero thumbnail photos instead of flat colors. Users get a shareable public link to show off how many places they have visited.

---

## Architecture

**Stack:** Next.js 14 (App Router) on Vercel, Supabase (auth + Postgres + Storage), Globe.gl (Three.js globe renderer), GeoJSON from Natural Earth.

**Reverse geocoding:** Nominatim (free, no API key). Run server-side in a Next.js API route.

**EXIF parsing:** `exifr` library, run server-side on upload.

**Thumbnail generation:** Server-side on upload, resized to 400x400px, stored as a separate file in Supabase Storage. The globe never loads original-resolution images.

```
Next.js (Vercel)
  /app/[username]         public globe view (no auth required)
  /app/dashboard          owner upload + manage view (auth required)
  /app/api/upload         EXIF parse + reverse geocode + thumbnail generation
  /app/api/geocode        place name string -> lat/lng (manual location entry)

Supabase
  auth                    email + Google OAuth
  storage: photos         original files + thumbnails
  postgres                users, photos, regions tables
```

**Shareable URL:** `wenthere.app/[username]` -- public by default, no extra config needed.

---

## Data Model

```sql
users
  id            uuid PK
  username      text unique
  avatar_url    text
  created_at    timestamptz

photos
  id            uuid PK
  user_id       uuid FK -> users.id
  storage_path  text        -- original file
  thumbnail_path text       -- 400x400 resized
  taken_at      timestamptz -- from EXIF or upload time
  uploaded_at   timestamptz
  lat           float
  lng           float
  country_code  text        -- ISO 3166-1 alpha-2
  country_name  text
  region_code   text        -- ISO 3166-2 (state/province)
  region_name   text
  is_hero       bool        -- user-selected hero for this region
  caption       text

regions (denormalized cache, rebuilt on photo add/remove)
  id            uuid PK
  user_id       uuid FK -> users.id
  country_code  text
  country_name  text
  region_code   text        -- null = country-level record
  region_name   text
  hero_photo_id uuid FK -> photos.id
  photo_count   int
```

Key decisions:
- `is_hero` lives on the photo row so users can swap hero shots without touching the region record.
- The `regions` cache means the globe loads with a single lightweight query.
- Both a country-level and region-level record exist per visited area, supporting the zoom mechanic cleanly.

---

## Location Data

Three supported methods, in priority order:

1. **GPS EXIF** -- auto-parsed on upload, silently geocoded. No user action needed.
2. **Manual map pin** -- shown if no EXIF GPS. A modal with an embedded map; user drops a pin.
3. **Type a place name** -- text input in the same modal, calls `/api/geocode` (Nominatim), resolves to lat/lng.

---

## Globe Interaction

### Zoom levels

**Country level (default, zoomed out)**
- GeoJSON source: Natural Earth `ne_110m_admin_0_countries`
- Visited countries: polygon textured with the country's hero thumbnail
- Unvisited countries: dark muted fill (#1a2e45)
- Hover: tooltip showing country name + photo count
- Click: camera animates into that country, triggers region zoom

**Region level (zoomed in)**
- GeoJSON source: Natural Earth `ne_10m_admin_1_states_provinces` filtered to the selected country
- Visited regions: polygon textured with the region's hero thumbnail
- Unvisited regions within a visited country: slightly lighter muted fill to distinguish from unvisited countries
- Click on a region: opens lightbox
- Back button (top left) or scroll out: returns to country level

### Lightbox

- Full-screen overlay, dark background
- Hero photo displayed large (centered, max 90vh)
- Horizontal filmstrip of all photos in the region below
- Arrow keys + swipe navigation
- Shows: caption, date taken, region + country name
- Close: ESC key or click outside the photo

### Upload (owner only)

- Floating upload button, bottom-right of globe, visible only when logged in as owner
- Drag-and-drop or file picker, supports multiple files
- Per-file progress shown inline
- Server-side: EXIF parse -> reverse geocode -> thumbnail generation
- If GPS found: silent, photo placed automatically
- If no GPS: map pin modal appears (supports pin drop or place name text)
- After upload: globe re-renders with new region(s) highlighted

---

## Sharing

- All globes are public by default
- Sidebar "share my globe" button copies `wenthere.app/[username]` to clipboard
- Visitor sees the full globe, can spin/zoom, view all country and region thumbnails, open lightbox
- Visitor cannot upload or change anything (no auth = read-only)

---

## Pages & Routes

| Route | Auth | Description |
|---|---|---|
| `/[username]` | None | Public globe view at `wenthere.app/[username]` |
| `/dashboard` | Required | Owner's globe with upload button |
| `/login` | None | Email + Google OAuth sign in |
| `/register` | None | Sign up + choose username |
| `/api/upload` | Required | POST -- handles file, EXIF, geocode, thumbnail |
| `/api/geocode` | Required | POST -- place name to lat/lng |

---

## Out of Scope (MVP)

- Per-photo or per-country privacy controls
- Comments or likes from visitors
- Video support
- Offline / PWA support
- Custom domain for globe URL
- Photo editing or cropping in-app

---

## Success Criteria

- Globe loads in under 2 seconds for a user with 20 visited countries
- Upload flow (including EXIF parse + geocode + thumbnail) completes in under 5 seconds per photo
- Shareable link works without login, on mobile and desktop
- Hero thumbnail swap takes one click and reflects on the globe immediately
