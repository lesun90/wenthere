# Globe

## Purpose

Renders the interactive 3D globe using Globe.gl (Three.js). Operates at two zoom levels: country level (Natural Earth `ne_110m_admin_0_countries`) and region level (`ne_10m_admin_1_states_provinces` filtered to the selected country). Visited polygons are textured with 400x400px hero thumbnails; unvisited polygons use muted fills. Handles hover tooltips, click-to-zoom camera animation, back navigation, and the floating upload button (owner only).

## Interface

- Accepts a `regions` array (fetched from Supabase) describing visited countries/regions and their hero thumbnail URLs.
- Emits `onRegionClick(regionCode)` to open the lightbox.
- Emits `onUploadRequest()` to trigger the upload flow (owner only).

## Dependencies

- Globe.gl / Three.js
- GeoJSON from Natural Earth (`ne_110m_admin_0_countries`, `ne_10m_admin_1_states_provinces`)
- Supabase Storage (thumbnail URLs)
- `auth` component (to determine owner vs. visitor)

## Status

- [ ] Not started
