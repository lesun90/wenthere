# Photo-Centric Profile Refactor Design

**Date:** 2026-05-21
**Status:** Approved for spec review

## Goal

Refactor traveler data so photos are the source of truth. The current nested structure makes countries, regions, hero photos, and galleries depend on duplicated fields. That allows brittle states such as a country with a hero image but no visited regions, and it makes adding a new user or photo more work than it should be.

The new model should make adding, removing, or updating photos straightforward while keeping the current globe UI/UX intact.

## Non-Goals

- No visual redesign.
- No persistence layer or upload UI in this refactor.
- No permanent adapter that converts a new source model back into the old `CountryMemory` / `SubdivisionMemory` shape.
- No changes to large/generated geo files unless a file is truly unused after the refactor.

## Source Model

`TravelerProfile` becomes photo-centric:

```ts
export interface TravelerProfile {
  id: string
  name: string
  photos: TravelPhoto[]
}

export interface TravelPhoto {
  id: string
  url: string
  caption: string
  takenAt?: string
  location: PhotoLocation
  heroFor?: {
    country?: boolean
    subdivision?: boolean
  }
  framing?: {
    country?: PhotoFrameTransform
    subdivision?: PhotoFrameTransform
  }
}

export interface PhotoFrameTransform {
  x: number
  y: number
  scale: number
}

export interface PhotoLocation {
  countryCode: string
  countryName: string
  countryNumericId?: string
  subdivisionCode?: string
  subdivisionName?: string
  renderable?: boolean
}
```

A country is visited when at least one photo has `location.countryCode`. A subdivision is visited when at least one photo has `location.subdivisionCode`. Region visits therefore imply country visits, and countries cannot become photo-backed independently of photos.

`renderable: false` is allowed for stress-only or missing-geometry locations. Those photos still count as memories, but their subdivision codes are excluded from geometry fetch/render lists.

`heroFor` selects which photo should be used as the hero for a country or subdivision. `framing` stores how that hero photo should be positioned inside the country or subdivision shape. The same photo may be a hero for both a country and a subdivision, so country framing and subdivision framing are separate.

## Derived Profile Index

Components should not repeatedly scan `profile.photos`. A single indexed view is built once per profile identity:

```ts
export interface ProfileIndex {
  countrySummariesByCode: Record<string, CountrySummary>
  countrySummariesByNumericId: Record<string, CountrySummary>
  subdivisionSummariesByCode: Record<string, SubdivisionSummary>
  photosByCountryCode: Record<string, TravelPhoto[]>
  photosBySubdivisionCode: Record<string, TravelPhoto[]>
  renderableSubdivisionCodes: string[]
  stats: {
    countryCount: number
    placeCount: number
    photoCount: number
  }
}
```

`buildProfileIndex(profile)` is pure and synchronous. `GlobeScene` should build it with `useMemo(() => buildProfileIndex(profile), [profile])` and pass it to child components. Profile selectors may wrap index reads, but they must not rebuild the index internally.

## Summary Types

`CountrySummary` and `SubdivisionSummary` are render-facing derived data, not source records:

```ts
export interface CountrySummary {
  countryCode: string
  countryNumericId: string
  name: string
  heroPic: string
  heroTransform?: PhotoFrameTransform
  photos: TravelPhoto[]
  subdivisionCodes: string[]
  photoCount: number
}

export interface SubdivisionSummary {
  subdivisionCode: string
  countryCode: string
  name: string
  heroPic: string
  heroTransform?: PhotoFrameTransform
  photos: TravelPhoto[]
  renderable: boolean
}
```

Hero selection is deterministic:

1. Prefer a photo marked `heroFor.country` or `heroFor.subdivision` for the requested place.
2. Otherwise use the first valid photo for that place in profile order.
3. If no photos remain, the place is not visited and has no hero.

Runtime editing state can remain in `GlobeScene` for this refactor, but the saved hero selection and saved framing belong to `TravelPhoto.heroFor` and `TravelPhoto.framing`. When a selected hero photo has no stored framing for the requested shape, the UI should use the existing default transform of `{ x: 0, y: 0, scale: 1 }`.

## Component Data Flow

The visible UI should stay the same. Components change from nested profile traversal to index reads:

| Consumer | New data source |
|---|---|
| `GlobeScene` | Builds `ProfileIndex` once and passes it down |
| `CountryLayer` | `profileIndex.countrySummariesByNumericId` |
| `SubdivisionLayer` | `profileIndex.renderableSubdivisionCodes` and `subdivisionSummariesByCode` |
| `GalleryPanel` | `photosBySubdivisionCode[subdivisionId]` and `SubdivisionSummary` |
| `IdentityStrip` | `profileIndex.stats` |
| `usePredictivePreload` | Indexed country/subdivision summaries |
| `lib/geodata.ts` | Replaced or rewritten as profile index/selectors |

Direct app/source reads of `profile.countries`, `country.subdivisions`, `CountryMemory`, and `SubdivisionMemory` should be removed.

## Add, Remove, And Update Semantics

The profile is immutable at React boundaries:

```ts
addPhoto(profile, photo) => nextProfile
removePhoto(profile, photoId) => nextProfile
updatePhoto(profile, photoId, patch) => nextProfile
```

This refactor does not need to build the UI for these operations, but the model must support them cleanly.

Adding a photo appends one `TravelPhoto`. The next profile index automatically derives country summary, subdivision summary, heroes, stats, preload targets, and gallery contents.

Removing a photo removes one `TravelPhoto`. If it was the only photo for a subdivision, that subdivision disappears from the visited subdivision index. If it was the only photo for a country, that country disappears from the visited country index. If it was a hero, the deterministic fallback selects the next valid photo.

Updating a photo changes one record. Moving a photo from one location to another automatically updates both affected places when the index rebuilds.

## No Repeat Computation

This refactor must avoid repeated profile scans in components. Existing patterns like `profile.countries.flatMap(...)`, repeated `find(...)`, repeated count reductions, and per-component lookup construction should be replaced by the shared `ProfileIndex`.

Rules:

- Build the profile index once per `profile` object identity.
- Pass the index to components that need profile-derived lookups.
- Keep selectors as cheap index reads.
- Do not fetch from selectors.
- Do not compute profile stats inside UI components.

## No Refetch Data

The refactor must preserve and strengthen cache-first behavior:

- Country TopoJSON should be fetched once and reused.
- Subdivision GeoJSON should use the existing module-level cache and known-miss entries.
- In-flight subdivision requests should stay deduped so preload and render paths cannot fetch the same file twice.
- Texture loading should continue through `useSharedTexture` and `preloadSharedTexture`.
- Profile indexing is pure data computation and must not trigger network requests.

## Demo And Stress Profiles

Both demo and stress users must be reauthored in the new photo-centric format.

`data/seed.ts` should export the demo traveler as `TravelerProfile` with one `photos` array. Existing demo photos, captions, country metadata, and subdivision metadata should be preserved.

`data/stressProfile.ts` should generate a photo-centric stress traveler. It should still target 100 countries and 500 region memories, use deterministic Picsum URLs, prefer real renderable subdivisions first, and mark synthetic or missing-geometry subdivisions as non-renderable. `stressProfileStats` should be derived from `buildProfileIndex`, not from old nested arrays.

`/demo` and `/stresstest` must exercise the same new profile model and the same profile index path.

## Legacy Cleanup

Remove stale old-model code as part of the refactor:

- Delete `CountryMemory` and `SubdivisionMemory` types.
- Delete or rewrite helpers that only support the nested model.
- Replace direct reads of old nested paths.
- Update active docs/comments that describe the current source data model, especially `CLAUDE.md` and `README.md` if they still mention the old structure.
- Keep historical design docs unless they block understanding current behavior.
- Use `rg` checks to confirm old active references are gone.

Expected cleanup checks after implementation:

```sh
rg "CountryMemory|SubdivisionMemory|profile\\.countries|country\\.subdivisions" app components data lib README.md CLAUDE.md
```

The command should return no active source references to the old model.

## Error Handling And Validation

Invalid or partial profile data should not crash the globe.

- Photo without `countryCode`: ignored by globe indexes and optionally reported by validation.
- Photo with country but no subdivision: country appears visited; no subdivision appears.
- Photo with subdivision but missing subdivision file: country appears; subdivision is treated as non-renderable once the fetch miss is cached.
- Duplicate photo IDs: reported by validation in development.
- Missing hero flag: fallback to first valid photo.
- Empty profile: renders the globe with zero counts and no visited textures.

Add a lightweight validation helper if it keeps the index builder clear, but do not add a heavy schema library for this refactor.

## Testing And Verification

Model-layer tests or sanity checks should cover:

- `buildProfileIndex` groups photos into countries and subdivisions correctly.
- Region visits imply country visits.
- Countries cannot appear as photo-backed without photos.
- Add/remove/update semantics produce the expected derived summaries.
- Hero fallback works when the marked hero is removed.
- Non-renderable subdivisions count as memories but are excluded from renderable subdivision codes.
- Demo profile produces expected country/place/photo counts.
- Stress profile produces expected country/place/photo counts through `buildProfileIndex`.

Project verification should run:

```sh
pnpm build
```

If a focused count-check script or test is added, run that before the build.

## Acceptance Criteria

- Current UI/UX is preserved for `/demo`.
- `/stresstest` still renders 100 countries and 500 region memories through the new model.
- Components consume `TravelerProfile` plus `ProfileIndex`, not the old nested data shape.
- Profile-derived lookups and stats come from one memoized index build.
- GeoJSON and texture caches remain cache-first and in-flight deduped.
- Adding/removing/updating a photo is represented by changing `profile.photos`, with derived state following automatically.
- Old nested-model source types and active references are removed.
