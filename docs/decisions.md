# Decisions & Open Questions

Tracked design decisions and unresolved questions for Wenthere.

## Open Questions

- [x] ~~Which map tile provider to use for the manual pin-drop modal (Leaflet + OpenStreetMap, or Mapbox)?~~
- [x] ~~How to handle Nominatim rate limits under concurrent uploads from multiple users?~~ — single-user MVP, not a concern.
- [x] ~~Sharp vs. jimp vs. `@squoosh/lib` for server-side thumbnail generation?~~ — Sharp; native binaries work fine in Docker, no cold-start penalty.
- [x] ~~GeoJSON bundle strategy?~~ — see decision below.
- [x] ~~Username availability check UX during registration~~ — no registration UI in MVP; single owner account seeded via migration.

## Decisions Made

- **GeoJSON serving strategy** — country-level file (~600KB, `ne_110m_admin_0_countries`) is served from `/public` and loaded on globe init. Region-level file (~10MB, `ne_10m_admin_1_states_provinces`) is also in `/public` but fetched lazily and filtered client-side to only the selected country when the user zooms in. Neither file goes in the JS bundle.

- **Thumbnail library: Sharp** — fastest, best quality, native binaries install cleanly in Docker. No Vercel cold-start concern since we're not deploying to Vercel.

- **MVP is single-user, no signup** — the owner account is pre-created via a seed migration (email + hashed password inserted directly into Supabase auth). `/register` route and username availability check are out of scope. Add multi-user signup post-MVP once the core experience is solid.

- **Pin-drop modal uses Globe.gl, not Leaflet** — Globe.gl's `onGlobeClick` returns `{ lat, lng }` directly; a small embedded Globe instance with a click-to-place marker is sufficient and keeps Leaflet out of the dependency tree entirely.

- **`is_hero` lives on the `photos` row** — so users can swap hero shots without touching the `regions` record. This avoids a two-table write on hero change.
- **`regions` table is a denormalized cache** — rebuilt on photo add/remove. Means the globe loads with a single lightweight query rather than aggregating at read time.
- **Both country-level and region-level records exist** — supports the two-zoom-level mechanic cleanly without conditional logic in the globe renderer.
- **Thumbnails capped at 400x400px** — the globe never loads original-resolution images, keeping initial load fast even for users with many visited countries.
- **All globes public by default** — no per-user privacy toggle needed for MVP; simplifies auth checks on the public route.
- **Nominatim for reverse geocoding** — free, no API key, run server-side. Acceptable for MVP upload volumes.

- **No Supabase — raw PostgreSQL + S3/MinIO + custom JWT** — the original spec assumed Supabase for auth, storage, and Postgres. The implementation uses direct `pg` connection to a Postgres container, MinIO for S3-compatible object storage, and `jose`-based JWT auth (HS256, 30-day cookies). This keeps the stack Docker-native with no managed service dependency. Owner credentials are plain env vars (`OWNER_EMAIL`, `OWNER_PASSWORD`) compared at login time.

- **Single hardcoded `OWNER_ID`** — rather than a proper users table lookup, the owner is identified by a fixed UUID (`00000000-0000-0000-0000-000000000001`) seeded via migration. The `username` is set from `OWNER_USERNAME` env var on startup via `instrumentation.ts`. No `/register` route was built.

- **Globe color palette: light sage, not dark navy** — the spec called for a dark `#1a2e45` fill for unvisited countries. The implementation uses a light sage palette (`#dde4d8` unvisited, `#a8bfb0` visited, `#dce8f0` ocean background) for a softer, print-inspired aesthetic.

- **Docker over Vercel** — the original spec targeted Vercel. The actual deployment uses Docker Compose: a Next.js container, a Postgres container, and a MinIO container. The `docker-compose.override.yml` mounts source code for live reload in development.
