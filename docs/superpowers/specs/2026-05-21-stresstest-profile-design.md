# Stresstest Profile Design Spec

## Goal

Add a development profile at `/stresstest` that exercises the globe with a large seeded traveler: 100 visited countries and 500 region memories. The profile should use remote Lorem Picsum URLs so the repository does not gain hundreds of binary test images.

## Approach

The app currently renders a single imported `travelerProfile`. The stress route will keep the same `TravelerProfile` data shape, but globe-facing components will accept a `profile` prop with the demo profile as the default. `/demo` remains unchanged, and `/stresstest` passes a generated `stressTravelerProfile`.

## Data

`data/stressProfile.ts` will build the profile from the bundled geography files:

- Select the first 100 usable country features from `public/geo/countries-50m.json`.
- Use deterministic `https://picsum.photos/seed/...` URLs for heroes and photos.
- Use real admin-1 features from `public/geo/states-provinces-50m.json` first.
- The bundled admin-1 file contains 297 real regions, so the remaining entries up to 500 will be synthetic region memories. They contribute to data size and image-loading stress, but only real admin-1 codes render as map shapes.

## Component Flow

- `GlobeScene` receives a `profile` prop and passes it to `CountryLayer`, `SubdivisionLayer`, `GalleryPanel`, and `usePredictivePreload`.
- `IdentityStrip` receives the same `profile` so country and place counts match the route.
- `lib/geodata.ts` uses an optional `countryNumericId` on country memories when mapping profile countries to TopoJSON country IDs.

## Testing

Verification will use TypeScript compilation and a lightweight profile-count check to confirm the generated profile has 100 countries and 500 region memories.
