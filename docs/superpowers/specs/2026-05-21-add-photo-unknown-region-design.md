# Add Photo — Unknown Region Support

**Date:** 2026-05-21
**Status:** Draft

## Problem

The subdivision GeoJSON (`states-provinces-50m.json`) is pre-filtered to 10 countries and only 3 Vietnam provinces (Hồ Chí Minh, Đà Nẵng, Ha Nội). Huế is absent. Even if a profile entry for Huế were added manually, no shape would render because the feature doesn't exist in the file.

Separately, `TravelerProfile` is a static constant — there is no runtime path to add photos or create new region entries.

## Goals

1. **Phase 1 — Full dataset:** Replace the pre-filtered monolithic GeoJSON runtime path with per-subdivision files generated from the full Natural Earth 50m worldwide dataset, loaded on demand
2. **Phase 2 — Mutable profile:** Make `TravelerProfile` mutable at runtime with a clean `addPhoto` API so new regions appear on the globe immediately

## Out of scope

- The add-photo UI wizard (upload trigger, EXIF GPS reading, text search, caption input) — separate spec
- Country-level data beyond switching the runtime country TopoJSON to `countries-10m.json`
- Persistence beyond in-memory state — storage layer is a stub, wired up later

---

## Phase 1 — Full dataset support

### 1a. Build script: `scripts/split-geo.js`

A Node script (run via `pnpm split-geo`) that:
1. Reads the full Natural Earth 50m admin-1 GeoJSON from a CLI argument: `node scripts/split-geo.js <path-to-ne_50m_admin_1_states_provinces.geojson>`
2. Strips unused properties — retains only `adm1_code`, `name`, `name_alt`, `name_en`, `adm0_a3`
3. Writes `public/geo/subdivisions/<adm1_code>.geojson` for each subdivision

The existing `public/geo/states-provinces-50m.json` is kept as the stress profile generation source while runtime globe loading moves to split files.

**File size estimate per subdivision (50m, stripped properties):**
- Small subdivision: a few KB
- Large/coastal subdivision: tens to hundreds of KB
- Compare: current monolithic file 2.4 MB covering only 10 countries

**Verification step:** after running the script, search `public/geo/subdivisions/VNM-*.geojson` for a feature with `name` matching "Thừa Thiên-Huế" (or equivalent). This resolves Open Question 1.

### 1b. SubdivisionLayer — lazy per-subdivision fetch

**Current:** single `fetch('/geo/states-provinces-50m.json')` on mount.

**New:** on mount, fetches one file per subdivision in the profile in parallel:

```ts
const subdivisionCodes = profile.countries.flatMap(c => c.subdivisions.map(s => s.subdivisionCode))
const files = await Promise.all(
  subdivisionCodes.map(code => fetch(`/geo/subdivisions/${code}.geojson`).then(r => r.json()))
)
// merge into single FeatureCollection in memory
```

The merged `FeatureCollection` is stored in state. Everything downstream (`visitedFeatures` filtering, geometry registration, rendering) is unchanged — it operates on the same data shape as today.

**CountryLayer fetches `countries-10m.json` in full on mount.**

### 1c. Predictive preload extension

`usePredictivePreload.ts` gains one call:

```ts
preloadSubdivisionFile(subdivisionCode: string): void
```

Called for each subdivision in the hovered country (same trigger as existing texture preload). Fetches and caches per-subdivision GeoJSON before the user taps the country, so the files are in the browser cache by the time the fly-to animation completes.

Implementation: module-level `Set<string>` of already-fetched codes, same pattern as `preloadSharedTexture`.

**Done when:** the globe loads with the same visual result as today, but generated `VNM-*.geojson` files include all Vietnam provinces including Huế. Adding the correct `adm1_code` to `data/seed.ts` causes Huế to render correctly.

---

## Phase 2 — Mutable profile

### 2a. ProfileContext (`lib/profile-context.tsx`)

A React context that holds `TravelerProfile` as mutable state, seeded from `travelerProfile` in `data/seed.ts`.

```ts
interface ProfileContextValue {
  profile: TravelerProfile
  addPhoto(
    photo: Photo,
    subdivisionCode: string,
    subdivisionName: string,
    countryCode: string,
    countryName: string,
  ): void
}
```

**`addPhoto` logic:**
1. Find existing `CountryMemory` for `countryCode`, or create one with `heroPic` set to the new photo URL and empty `photos[]`
2. Find existing `SubdivisionMemory` for `subdivisionCode`, or create one with `heroPic` set to the new photo URL
3. Append `photo` to `subdivision.photos[]`
4. If the country was just created (no heroPic yet), set `country.heroPic` to the photo URL
5. Call `saveProfile(profile)` stub — currently a no-op, replaced by real persistence later

`ProfileProvider` wraps the app at `app/layout.tsx`. All components read profile from context. The stresstest page continues to work: explicit `profile` prop passed to `GlobeScene` takes precedence over context.

### 2b. SubdivisionLayer — react to new subdivisions

When `addPhoto()` adds a photo for a subdivision not yet in the profile, the `useEffect` dependency on the profile fires, fetches the new subdivision's GeoJSON file, and merges it into the in-memory `FeatureCollection`. The new subdivision then appears on the globe automatically:

```
addPhoto() → ProfileContext setState
  → SubdivisionLayer useEffect([subdivisionCodes]) — fetches new subdivision file if needed
  → useMemo([profile, data]) reruns getVisitedSubdivisions()
  → visitedFeatures includes new adm1_code
  → SubdivisionFeature mounts → shape renders
```

**Done when:** calling `addPhoto()` with a subdivision not in `seed.ts` causes the region to light up on the globe without a page reload.

---

## Data model changes

No schema changes to `TravelerProfile`, `CountryMemory`, or `SubdivisionMemory`. The context API is additive.

`CountryMemory.photos[]` (currently always empty in the demo) is populated when a photo is added to a country with no matching subdivision in the GeoJSON — graceful fallback for truly unmapped regions.

---

## File changes summary

### Phase 1

| File | Change |
|---|---|
| `scripts/split-geo.js` | New — build script |
| `public/geo/subdivisions/` | New directory, per-subdivision GeoJSON files |
| `package.json` | Add `split-geo` script |
| `components/globe/CountryLayer.tsx` | Use `countries-10m.json` |
| `components/globe/SubdivisionLayer.tsx` | Per-subdivision fetch replacing monolithic fetch |
| `components/globe/usePredictivePreload.ts` | Add `preloadSubdivisionFile()` |
| `public/geo/states-provinces-50m.json` | Kept for stress profile generation |

### Phase 2

| File | Change |
|---|---|
| `lib/profile-context.tsx` | New — ProfileContext + addPhoto |
| `app/layout.tsx` | Wrap with ProfileProvider |
| `components/globe/GlobeScene.tsx` | Read profile from context; explicit prop takes precedence |
| `components/globe/SubdivisionLayer.tsx` | React to new countries added via addPhoto |
| `components/globe/GalleryPanel.tsx` | Read profile from context |
| `components/globe/CountryLayer.tsx` | Read profile from context |

---

## Open questions

1. Does the full Natural Earth 50m dataset include Huế (Thừa Thiên-Huế)? Answered during Phase 1 verification step.
2. If a region is missing from the 50m dataset entirely, should `addPhoto` succeed and store the photo at country level? Deferred to the add-photo UI spec.
