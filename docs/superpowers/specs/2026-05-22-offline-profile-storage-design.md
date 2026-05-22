# Offline Profile Storage Design

## Purpose

Add real offline user data storage for Beenthere while keeping the current globe and drawer UI/UX.

The first implementation stores user photos, edits, deletions, and hero framing locally in the browser. Online storage, auth, and sync are intentionally deferred, but the storage boundary should be shaped so a future online adapter can use the same profile operations.

## Goals

- Persist a user's profile across browser reloads.
- Store imported photo files locally.
- Support add, edit, and remove photo workflows from the existing drawer.
- Persist country and subdivision hero selections and framing.
- Keep the current visual design and interaction model.

## Non-Goals

- No online storage implementation.
- No auth or user accounts.
- No visual redesign.
- No EXIF/GPS location parsing.
- No multi-profile account switching.
- No backup export/import.
- No background sync or conflict resolution.

## Architecture

Add an offline-first storage boundary around the existing `TravelerProfile` shape.

Core modules:

- `lib/profile-store/types.ts`: shared store contracts, mutation payloads, and storage status types.
- `lib/profile-store/indexed-db-store.ts`: IndexedDB adapter for persisted profile records and local photo blobs.
- `lib/profile-store/local-profile-service.ts`: higher-level operations for add photos, edit photo, delete photo, and update hero/framing.
- `components/profile/ProfileProvider.tsx`: client state owner that loads the offline profile, resolves local photo URLs, builds `profileIndex`, and passes the same data down to `GlobeScene` and `ProfileUI`.

`app/demo/page.tsx` should stop treating `travelerProfile` as the live source after first load. The demo seed becomes the initial offline profile only when no stored profile exists.

`GlobeScene` and `ProfileUI` should continue to receive `profile` and `profileIndex`. Their public UI behavior should remain the same; the main change is that existing callbacks become wired to persistent profile operations.

## Persistent Data Model

Use the existing profile domain model as the persisted user data:

- `TravelerProfile`: user id, display name, photos, and presentation preferences.
- `TravelPhoto`: id, image reference, caption, optional date, and location codes.
- `ProfilePresentation`: selected hero photo and framing for countries and subdivisions.

Imported offline photos need a source descriptor so the app can distinguish static app assets from browser-local blobs:

```ts
export interface TravelPhoto {
  id: string
  url: string
  caption: string
  takenAt?: string
  location: PhotoLocation
  source?: PhotoSource
}

export type PhotoSource =
  | { kind: 'asset' }
  | { kind: 'localBlob'; key: string; mimeType: string; fileName?: string }
```

Seed/demo photos can omit `source` or use `source.kind = 'asset'`. Imported photos use `source.kind = 'localBlob'` and reference a stable blob key such as `photo:<profileId>:<photoId>`.

Because the rendering code consumes `TravelPhoto.url`, the profile service resolves local blob records to browser object URLs at runtime. Persisted profile metadata should store the blob key, not the temporary object URL.

Photos with missing or invalid location data remain visible in the management drawer but do not light up the globe until the user assigns a valid country and region. In persisted metadata, an unplaced imported photo may use an empty `countryCode` and omit `subdivisionCode`; existing index-building behavior should skip it until it has a valid country.

## IndexedDB Layout

Use one IndexedDB database, for example `beenthere-offline`, with versioned stores:

- `profiles`: keyed by profile id. Stores serialized `TravelerProfile` metadata.
- `photoBlobs`: keyed by blob key. Stores `Blob` data plus mime type, filename, created time, and size.
- `meta`: keyed by string. Stores active profile id, schema version, and migration markers.

The first version supports one active profile. The store interfaces should avoid assuming only one profile forever, but the UI should not expose multi-profile switching yet.

## Data Flow

### Load

1. `ProfileProvider` opens IndexedDB.
2. If a stored active profile exists, it loads the profile and all referenced local blobs.
3. If no stored profile exists, it seeds from `travelerProfile`, stores that profile, and uses it as the active profile.
4. The provider resolves local blob references into object URLs.
5. It builds `profileIndex` from the resolved profile and renders the existing globe and drawer.

### Import Photos

1. `PhotoManagementDrawer` passes selected image files to the provider/service through the existing `onImportFiles` callback.
2. The service creates stable photo ids and blob keys.
3. It stores each file in `photoBlobs`.
4. It appends photo records to the profile with `source.kind = 'localBlob'`.
5. New photos appear in the drawer immediately.
6. Imported photos start with empty or incomplete location data. The app should open or select the existing edit flow so the user can set caption, date, country, and region.

### Edit Photo

1. The drawer submits the existing edit draft.
2. The service maps country and region names to stable geo codes using shared geo metadata, not only the current user's visited `profileIndex`.
3. It validates the location before saving.
4. On success, the service updates the profile record and the provider rebuilds `profileIndex`.
5. On failure, the edit panel remains open and shows concise validation feedback.

### Delete Photo

1. The drawer calls the persistent delete operation.
2. The service removes the photo from `profile.photos`.
3. If the photo is local, it removes the referenced blob.
4. It clears country or subdivision hero references that pointed to the deleted photo.
5. Existing indexing behavior chooses fallback heroes from remaining photos.

### Hero Selection And Framing

`GalleryPanel` framing and hero changes should write into `profile.presentation.countryHeroes` and `profile.presentation.subdivisionHeroes`.

This replaces the current ephemeral `GlobeScene` override state for persisted behavior. The user should see the same immediate visual update, but the result should survive reloads.

## Error Handling And States

- Loading: use the existing full-screen `beenthere` loader while IndexedDB opens.
- Storage unavailable: fall back to in-memory demo mode and show a small non-blocking message in the drawer area.
- Import failure: skip failed files, keep successful files, and show concise drawer feedback.
- Edit validation failure: keep the edit panel open and show the issue without changing the globe.
- Delete failure: keep the row visible and show retry feedback.

The provider owns object URL creation and cleanup. It should revoke old object URLs when a profile reloads, when local photos are deleted, and when the provider unmounts.

## Component Integration

`ProfileProvider` should expose:

```ts
interface ProfileState {
  profile: TravelerProfile
  profileIndex: ProfileIndex
  loading: boolean
  storageStatus: 'ready' | 'memory-fallback' | 'error'
  errorMessage?: string
  importPhotos(files: File[]): Promise<void>
  editPhoto(photoId: string, draft: PhotoEditDraft): Promise<void>
  deletePhoto(photoId: string): Promise<void>
  setCountryHero(countryCode: string, photoId: string): Promise<void>
  setSubdivisionHero(subdivisionCode: string, photoId: string): Promise<void>
  setCountryFraming(countryCode: string, framing: PhotoFrameTransform): Promise<void>
  setSubdivisionFraming(subdivisionCode: string, framing: PhotoFrameTransform): Promise<void>
}
```

The exact shape can change during implementation, but the boundary should keep persistence concerns out of globe rendering components.

## Validation

Persisted updates should reuse or extend `validateProfile(profile)` for:

- duplicate photo ids
- missing country code when a photo is intended to be renderable
- subdivision/country mismatch
- hero references to missing photos
- country hero photo outside the country
- subdivision hero photo outside the subdivision

## Testing

Add focused checks for the service-level mutation logic:

- add local photo record
- edit caption, date, and location
- delete photo and clear hero references
- update country and subdivision framing

Keep most logic testable without real IndexedDB by testing pure profile mutations separately from the adapter. IndexedDB behavior can be covered with a small browser-compatible fake or a narrow adapter test.

Existing profile-index checks should still pass. Final verification should run `pnpm build`; if a focused script is added for profile storage, run that before the build.

## Future Online Storage

The offline service should be designed as one implementation of a profile storage interface. A future online adapter can add auth, remote photo object storage, database records, and sync without changing the globe UI contract.

Do not implement online storage in this phase.
