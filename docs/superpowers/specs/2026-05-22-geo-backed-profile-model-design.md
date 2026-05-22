# Geo-Backed Profile Model Refactor

## Purpose

Refactor the profile/location data model so user profile data stores only user-owned facts, while country and subdivision metadata comes from shared geo data.

The current profile-level `LocationCatalog` approach is not scalable. It requires each profile to copy country names, numeric IDs, subdivision names, and subdivision ownership. That becomes brittle when users add new regions or when the app supports many users.

## Non-Goals

- No UI or UX changes.
- No visual redesign.
- No interaction changes.
- No new profile management workflow.
- No change to globe rendering behavior except deriving labels and IDs from shared geo metadata.
- No database or API implementation in this refactor.

## Target Model

Profiles should describe where a user's photos belong, not what those places are.

```ts
export interface PhotoLocation {
  countryCode: string
  subdivisionCode?: string
  renderable?: boolean
}

export interface TravelerProfile {
  id: string
  name: string
  photos: TravelPhoto[]
  presentation?: ProfilePresentation
}
```

Remove profile-owned geo metadata:

- `LocationCatalog`
- `CountryLocationReference`
- `SubdivisionLocationReference`
- `TravelerProfile.locations`

Keep both `countryCode` and optional `subdivisionCode`. `countryCode` supports country-only photos, simpler imports, simpler grouping, and future API/database records. When `subdivisionCode` exists, validation should confirm that shared geo data says it belongs to the same `countryCode`.

## Shared Geo Metadata

Add a shared geo metadata layer, likely `lib/geo-metadata.ts`, with a small API:

```ts
getCountryMetadata(countryCode)
getSubdivisionMetadata(subdivisionCode)
validateSubdivisionCountry(subdivisionCode, countryCode)
```

The metadata layer owns country names, numeric country IDs, subdivision names, and subdivision-to-country relationships.

Initial metadata can be derived from existing project geo data:

- countries from the existing country TopoJSON properties or a generated/static country metadata map
- subdivisions from GeoJSON properties such as `adm1_code`, `adm0_a3`, `name`, and `name_en`

The important boundary is that profiles do not copy this data.

## Geo Data Storage

Move canonical geo data out of `public/`.

`public/` should not be the source of truth for country or subdivision metadata. It is a client-serving directory, so keeping canonical data there couples server-side indexing, validation, profile generation, and browser asset delivery too tightly.

Use a private source-data location for canonical geo data, such as:

- `data/geo/`
- `geodata/`
- another non-public app data directory chosen during implementation

The app may still generate or expose optimized client assets under `public/geo/` when browser-side rendering needs direct URLs. Those files should be treated as build/runtime artifacts derived from canonical geo data, not as the model's source of truth.

This split supports future webapp behavior where server-side profile validation, API routes, background imports, and user-specific indexing can read shared geo metadata without depending on publicly served static files.

## Multi-User Webapp Readiness

This refactor should make seeded profiles replaceable by API or database records without changing the globe/indexing model.

Future user data should be shaped around user-owned records:

- users
- profiles
- photos
- photo location codes
- presentation preferences such as selected hero photos

Shared geo records should remain app-owned/reference records:

- countries
- subdivisions
- geometry
- display metadata
- country/subdivision relationships

No user profile should contain copied country names, subdivision names, country numeric IDs, or subdivision ownership maps. Multiple users can reference the same `countryCode` and `subdivisionCode`; the app resolves those codes through the shared geo metadata layer.

## Profile Index Behavior

`buildProfileIndex(profile)` remains the UI-facing aggregation layer.

It should derive:

- `CountrySummary.name`
- `CountrySummary.countryNumericId`
- `SubdivisionSummary.name`
- subdivision-country consistency

from shared geo metadata instead of `profile.locations`.

Fallback behavior:

- unknown country name falls back to `countryCode`
- unknown country numeric ID falls back to `countryCode`
- unknown subdivision name falls back to `subdivisionCode`
- validation reports missing or mismatched subdivision metadata

## Demo Data

`data/seed.ts` should contain only demo profile facts:

```ts
photo('demo-usa-ca-1', '/demo/10.jpg', 'Golden Gate at dusk', {
  countryCode: 'USA',
  subdivisionCode: 'USA-3521',
})
```

`data/roamerProfile.ts` remains a demo/stress-test generator. It may read shared geo data to choose valid subdivision codes and create captions, but it must not export or attach a per-profile `locations` catalog.

In a multi-user future, seeded profiles can be replaced by database or API data using the same `TravelerProfile` shape.

## Validation

`validateProfile(profile)` should continue to validate profile-owned data and presentation references.

Add or preserve validation for:

- missing `location.countryCode`
- duplicate photo IDs
- country hero photo outside the country
- subdivision hero photo outside the subdivision
- subdivision metadata missing from shared geo data
- subdivision metadata country mismatch with `location.countryCode`

## Testing

Update `scripts/check-profile-index.cjs` to assert:

- photo locations expose only stable codes and `renderable`
- profile objects do not expose `locations`
- country and subdivision summary names are still derived correctly
- country numeric IDs are still derived correctly
- mismatched subdivision/country data is reported by validation
- existing demo and Roamer profile counts remain unchanged

Run the narrow profile check after implementation. Run a TypeScript/build check when the local `.next` permissions allow it.
