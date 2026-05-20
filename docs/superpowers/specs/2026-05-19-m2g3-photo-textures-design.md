# M2G3 — Photo Textures: Visited Countries and Subdivisions

**Date:** 2026-05-19
**Status:** Approved for implementation planning
**Milestone:** M2 — Globe UI/UX → G3

---

## Goal

Visited countries and subdivisions display travel photos as textures on the globe surface. The globe uses seeded demo data for the United States, China, and Vietnam. Each visited subdivision has a hero photo (globe texture) and a photo gallery. The data shape mirrors what the real product will return from a future API, so no schema changes are needed when the demo transitions to real user data.

---

## Photo Assets

**Source:** Lorem Picsum (fixed IDs for reproducibility)
**Dimensions:** 1200×800
**Download URL pattern:** `https://picsum.photos/id/{id}/1200/800`
**Storage:** flat directory `public/demo/`, files named `{id}.jpg`

| Country | Subdivision | Picsum IDs | Files |
|---------|-------------|------------|-------|
| US | California | 10, 11 | `10.jpg`, `11.jpg` |
| US | Texas | 12, 13 | `12.jpg`, `13.jpg` |
| US | New York | 14, 15 | `14.jpg`, `15.jpg` |
| US | Illinois | 16, 17 | `16.jpg`, `17.jpg` |
| US | Florida | 18, 19 | `18.jpg`, `19.jpg` |
| CN | Guangdong | 20, 21 | `20.jpg`, `21.jpg` |
| CN | Sichuan | 22, 23 | `22.jpg`, `23.jpg` |
| CN | Yunnan | 24, 25 | `24.jpg`, `25.jpg` |
| CN | Beijing | 26, 27 | `26.jpg`, `27.jpg` |
| CN | Xinjiang | 28, 29 | `28.jpg`, `29.jpg` |
| VN | Da Nang | 30, 31 | `30.jpg`, `31.jpg` |
| VN | Ha Noi | 32, 33 | `32.jpg`, `33.jpg` |
| VN | Ho Chi Minh | 34, 35 | `34.jpg`, `35.jpg` |

**Total:** 26 images (~3–5 MB committed to repo)

No subdirectory organization — the seed data encodes which photo belongs where, not the file system.

---

## Data Schema

### `data/seed.ts`

Single file exporting the full traveler profile inline. No external JSON files, no dynamic loading.

```typescript
interface Photo {
  url: string;     // "/demo/{id}.jpg" in demo; real product → CDN URL
  caption: string;
}

interface SubdivisionMemory {
  subdivisionCode: string; // adm1_code from Natural Earth 50m admin-1 GeoJSON
  name: string;
  heroPic: string;         // URL — must reference one photo in photos[]
  photos: Photo[];         // all photos for this subdivision (includes hero)
}

interface CountryMemory {
  countryCode: string;     // ISO 3166-1 alpha-3 (e.g. "USA", "CHN", "VNM")
  name: string;
  heroPic: string;         // URL — must reference one photo in photos[]
  photos: Photo[];         // all country-level photos (includes hero)
  subdivisions: SubdivisionMemory[];
}

interface TravelerProfile {
  name: string;
  countries: CountryMemory[];
}

export const travelerProfile: TravelerProfile = { ... }
```

**Hero photo rule:** `heroPic` is a URL string pointing to one of the entries in `photos[]`. It is the photo rendered as the globe texture. The gallery renders all `photos[]`. No index magic — hero is named explicitly.

**Country-level photos in this demo:** All 26 photos are seeded at the subdivision level. `CountryMemory.heroPic` reuses the first subdivision's `heroPic` URL (e.g., USA's country hero = California's hero). `CountryMemory.photos[]` is empty for now — the gallery will display subdivision photos when M3 is built.

**`adm1_code` values** are looked up from the Natural Earth 50m admin-1 GeoJSON during implementation (`adm1_code` property on each feature).

---

## Derivation Layer

### `lib/geodata.ts`

Pure functions — no rendering knowledge, no Three.js imports.

```typescript
export function getVisitedCountries(
  profile: TravelerProfile
): Record<string, string>
// Returns: { countryCode → heroPic URL }
// Used by CountryLayer to decide which countries get photo textures

export function getVisitedSubdivisions(
  profile: TravelerProfile
): Record<string, string>
// Returns: { adm1_code → heroPic URL }
// Used by SubdivisionLayer to filter which features to render
```

`CountryLayer` and `SubdivisionLayer` consume these plain objects — they have no knowledge of how photos are stored or where seed data lives.

---

## Globe Integration

**`CountryLayer`:** calls `getVisitedCountries()`. Visited countries render as filled `THREE.Mesh` with photo texture mapped to the polygon. Non-visited countries remain transparent.

**`SubdivisionLayer`:** calls `getVisitedSubdivisions()`. Loads the full worldwide admin-1 dataset but only instantiates features whose `adm1_code` appears in the lookup. Draw calls stay proportional to photos taken, not world geography.

**Hover HUD:** pointer-enter on a visited feature shows the subdivision/country name and `heroPic` thumbnail in a fixed overlay.

**Fallback:** photo load failure → warm accent fill (`#C8874A`). No blank or broken state.

---

## What Is Not in This Milestone

- Database design — deferred to M5 (Add User)
- Country-level photo gallery — M3 concern; `photos[]` array is seeded now, displayed later
- Photo upload UI — out of scope for all demo milestones
- Subdivision coverage beyond US, China, Vietnam

---

## Done When

- 26 Picsum images committed to `public/demo/`
- `data/seed.ts` compiles with correct types and `adm1_code` values that match the GeoJSON
- `lib/geodata.ts` exports the two derivation functions with correct return types
- Visited countries visually pop against the base globe with photo textures
- Subdivision mode shows only photo-backed regions (not all world subdivisions)
- Hover tooltip appears with name and hero photo thumbnail
- Fallback accent color shows when a photo fails to load
