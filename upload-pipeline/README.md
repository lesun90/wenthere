# Upload Pipeline

## Purpose

Server-side handler for the photo upload flow, exposed as the `/api/upload` Next.js route. Receives one or more image files, parses EXIF metadata with `exifr` to extract GPS coordinates, reverse-geocodes coordinates to country and region via Nominatim, resizes each photo to a 400x400px thumbnail, and writes both the original and thumbnail to Supabase Storage. Inserts a row into `photos` and rebuilds the affected `regions` cache rows. If no GPS is found in EXIF, the client sends a manually resolved `{ lat, lng }` instead.

## Interface

- `POST /api/upload` — multipart form: `file` (one or more images) + optional `lat`, `lng` override.
- Returns updated region data for the affected countries/regions so the globe can re-render immediately.

## Dependencies

- `exifr` — EXIF parsing
- Nominatim — reverse geocoding (server-side fetch, no API key)
- Supabase Storage — stores originals and thumbnails
- Supabase Postgres — writes to `photos`, rebuilds `regions`
- `auth` component — verifies the request is from the authenticated owner

## Status

- [ ] Not started
