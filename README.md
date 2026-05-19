# Wenthere

A single-owner travel photo album where photos are displayed on an interactive 3D globe. Visited countries and regions are covered by hero thumbnail photos instead of flat colors. The globe is publicly shareable without login.

## Components

- **Globe** — 3D globe renderer using Globe.gl (Three.js); country and region zoom levels, hero thumbnail polygon textures, floating badge icons, hover tooltips, and camera animation
- **Upload pipeline** — server-side file handler: EXIF GPS parsing, Nominatim reverse geocoding, Sharp thumbnail generation (400×400px), S3 storage writes, and Postgres region cache rebuild
- **Lightbox** — full-screen photo viewer overlay with filmstrip, arrow/swipe navigation, captions, and date/location metadata
- **Auth** — custom JWT auth (`jose`, HS256); owner email/password from env vars, 30-day `httpOnly` session cookie, middleware protection on upload and dashboard routes

## Quick Start

```bash
cp .env.example .env   # fill in OWNER_EMAIL, OWNER_PASSWORD, OWNER_USERNAME, JWT_SECRET
```

**Development — live reload on every file save:**
```bash
docker compose up
```
Source code is mounted into the container. Save a file → browser updates instantly.
First start installs dependencies inside Docker (~30 s); subsequent starts are fast.

**Production — optimised build:**
```bash
docker compose -f docker-compose.yml up --build
```
GeoJSON map data (~17 MB) downloads automatically during build.

App: http://localhost:3000 · MinIO console: http://localhost:9001

## Docs

- [Spec](docs/spec.md)
- [Design](docs/design.md)
- [Decisions](docs/decisions.md)
- [Progress](docs/progress.md)
