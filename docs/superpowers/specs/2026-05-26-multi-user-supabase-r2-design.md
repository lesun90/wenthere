# Multi-User Supabase + R2 Design

Date: 2026-05-26

## Summary

Beenthere will support multiple signed-in users while preserving the current
first-screen globe experience. Users sign in with email magic link or OTP,
upload and manage their own travel photos, and privately edit their own globe.
Each profile also has a public read-only URL that stays live with the owner's
latest edits, controlled by a profile-level visibility toggle.

The chosen architecture is server-mediated Supabase plus Cloudflare R2:

- Supabase Auth handles email magic link/OTP sign-in.
- Supabase Postgres stores profile, photo, presentation, visibility, and admin
  metadata.
- Cloudflare R2 stores original and display-ready image objects.
- Next.js app routes/server APIs enforce owner, public, and admin access.
- The existing `ProfileStore` boundary remains the UI-facing storage interface.

## Goals

- Give each beta user a private editable globe.
- Give each profile a stable public read-only URL.
- Keep public profile data live without a manual publish or sync step.
- Let users hide their public globe at any time.
- Keep media costs predictable by storing image objects in R2.
- Keep Supabase rows metadata-focused.
- Add a protected admin page for beta operations and diagnostics.
- Preserve the current globe-centered product surface.

## Non-Goals

- Team or household collaboration.
- Per-photo public/private visibility.
- Password-based account management.
- Direct admin editing of users' travel memories.
- A public profile publishing workflow separate from the live profile.
- A large account dashboard replacing the first-screen globe.

## Chosen Architecture

```text
Signed-in owner
  -> Next.js app routes / server APIs
    -> Supabase Auth: magic link / OTP session
    -> Supabase Postgres: profiles, photos, presentation, visibility
    -> Cloudflare R2: original and display-ready image objects

Public viewer
  -> /u/:slug
    -> Next.js public profile route
      -> Supabase Postgres: visible profile only
      -> R2: read-only image delivery

Admin user
  -> /admin
    -> Next.js admin route/API
      -> Supabase Auth session + admin role check
      -> Supabase Postgres: user/profile/photo diagnostics
      -> R2 metadata/object cleanup tools
```

The globe UI should not import Supabase or R2 clients directly. Cloud storage
belongs behind a new implementation in `@beenthere/storage-cloud`, matching the
existing `ProfileStore` shape:

```ts
interface ProfileStore {
  getActiveProfile(): Promise<TravelerProfile | null>
  saveActiveProfile(profile: TravelerProfile): Promise<void>
  putPhotoBlob?(key: string, file: File): Promise<void>
  deletePhotoBlob?(key: string): Promise<void>
}
```

The cloud implementation may translate full-profile save calls into scoped API
updates internally. The UI should continue to work with `TravelerProfile`,
`ProfileProvider`, profile indexes, and existing mutation helpers.

## Alternatives Considered

### Direct Supabase Client + Presigned R2

The browser would use Supabase JS and RLS for profile metadata, with a small API
issuing R2 upload/read URLs.

This is viable, but permissions become split across client code, RLS policies,
and R2 signing APIs. For Beenthere's public read-only globe and image-heavy
traffic, server-mediated routes are easier to reason about during beta.

### Supabase Storage First, R2 Later

Supabase would handle auth, metadata, and photo storage first, while preserving a
storage adapter for future R2 migration.

This is fastest, but it postpones the media-cost decision. Since public profile
viewing can create photo egress pressure, R2 should be part of the beta design.

## Data Model

Supabase stores durable rows. The app assembles those rows into the existing
`TravelerProfile` domain object.

```text
profiles
  id uuid primary key
  owner_id uuid references auth.users(id)
  slug text unique not null
  display_name text not null
  public_visible boolean default false
  suspended_at timestamptz null
  deleted_at timestamptz null
  created_at timestamptz
  updated_at timestamptz

photos
  id uuid primary key
  profile_id uuid references profiles(id)
  original_r2_key text unique not null
  display_r2_key text unique null
  thumb_r2_key text unique null
  caption text not null
  taken_at date null
  country_code text not null
  subdivision_code text null
  mime_type text not null
  byte_size int not null
  width int null
  height int null
  status text default 'uploading'
  upload_completed_at timestamptz null
  deleted_at timestamptz null
  created_at timestamptz
  updated_at timestamptz

profile_presentation
  profile_id uuid primary key references profiles(id)
  country_heroes jsonb default '{}'
  subdivision_heroes jsonb default '{}'
  updated_at timestamptz

admin_users
  user_id uuid primary key references auth.users(id)
  role text not null
  created_at timestamptz
```

`display_name` maps to `TravelerProfile.name`.

Only active, non-deleted photos are included when assembling a profile:

```text
photos.status = 'active'
photos.deleted_at is null
```

Photo source metadata should use a cloud object source:

```ts
source: {
  kind: 'cloudObject',
  key: r2_key,
  mimeType,
  fileName?
}
```

`jsonb` is used for presentation state because the app needs normalized
structured data, not exact JSON formatting or key order. Postgres will not
enforce that hero `photoId` values exist inside `jsonb`; the API must validate
presentation references before writing.

Slug rules:

- Slugs are stable, unique, lowercase, and user-facing.
- V1 generates a slug during onboarding.
- Reserved slugs include `admin`, `api`, `demo`, `login`, `settings`,
  `stresstest`, and `u`.

## Access Rules

Owner rules:

- Signed-in users can read and write only their own profile and photo rows.
- Owner APIs verify Supabase session server-side.
- Supabase RLS should also enforce ownership as a backstop.

Public rules:

- Public viewers can read only profiles where:
  - `public_visible = true`
  - `suspended_at is null`
  - `deleted_at is null`
- Public routes never expose owner email, auth metadata, or admin metadata.
- The public globe is read-only and uses the same live profile rows as the
  owner view.

Admin rules:

- Admin routes require a Supabase session and `admin_users` role check.
- Admin users can list profiles, inspect photo counts/storage usage/status, hide
  or suspend public profiles, and run cleanup for failed/deleted/orphaned image
  objects.
- V1 admin should not directly edit users' memories, captions, locations, or
  presentation framing.

## Beta Defaults

- Maximum upload size: 10 MB per original photo.
- Maximum photos: 500 active photos per profile.
- Accepted MIME types: `image/jpeg`, `image/png`, and `image/webp`.
- Image variants: create one display image and one thumbnail for each active
  photo.
- Public image delivery: use the proxy route by default.
- Invalid framing values: reject the request instead of silently clamping.

## Data Flows

### Owner Load

```text
Owner opens app
  -> Supabase session is checked server-side
  -> /api/profile returns the owner's active TravelerProfile
  -> ProfileProvider builds ProfileIndex locally
  -> Globe renders with edit/manage controls
```

If no session exists, owner routes redirect to sign-in. Magic-link callback
creates the user's primary profile if it does not exist.

### Photo Upload

```text
Owner selects photos
  -> Next.js upload API verifies owner session
  -> API validates type, size, and beta quota
  -> API creates photo rows as uploading
  -> API writes original objects to R2
  -> API creates display/thumb variants
  -> API marks photos active
  -> API returns updated TravelerProfile
```

Failed uploads are marked `failed`. They are excluded from normal profile reads
and visible to admin cleanup tools.

### Profile Edit

```text
Owner edits caption/location
  -> UI applies existing mutation logic
  -> CloudProfileStore sends scoped update to API
  -> API validates ownership and profile integrity
  -> Supabase rows are updated
  -> Public profile reflects the change if visible
```

The cloud store may keep `saveActiveProfile(profile)` as the UI-facing method,
but should translate the profile into scoped row updates when practical.

### Hero Selection And Framing

Hero and framing changes are presentation-only updates.

```text
Owner adjusts hero frame
  -> UI keeps live override locally while dragging/sliding
  -> Owner commits the edit
  -> UI calls setCountryHero or setSubdivisionHero
  -> CloudProfileStore sends PATCH /api/presentation
  -> API verifies owner session
  -> API validates the target photo and framing values
  -> API updates profile_presentation jsonb
  -> Owner and public profile read the new frame immediately
```

Stored shape stays close to the current profile format:

```json
{
  "USA": {
    "photoId": "photo-id",
    "framing": {
      "x": 0.1,
      "y": -0.2,
      "scale": 1.4
    }
  }
}
```

Validation rules:

- Hero photo must belong to the profile.
- Hero photo must be active and not deleted.
- Country hero photo must belong to that country.
- Subdivision hero photo must belong to that subdivision.
- Country and subdivision heroes remain independent.
- Framing values outside the allowed bounds are rejected.

Recommended framing bounds:

```text
x: -1 to 1
y: -1 to 1
scale: 1 to 3
```

### Photo Removal

Photo removal is soft delete first, object cleanup second.

```text
Owner deletes photo
  -> UI calls deletePhoto(photoId)
  -> API verifies session and profile ownership
  -> API marks photos.deleted_at and status = 'deleted'
  -> API removes that photo from country/subdivision hero jsonb references
  -> API returns updated TravelerProfile
  -> Best-effort R2 delete runs after DB update
  -> Admin cleanup can retry failed/orphaned object deletes
```

R2 deletion targets every stored variant:

```text
original_r2_key
display_r2_key
thumb_r2_key
```

If a deleted photo was a hero, the API clears the stale hero reference and the
existing profile-index fallback behavior chooses the next valid photo.

### Public View

```text
Visitor opens /u/:slug
  -> Server checks slug
  -> Server checks public_visible, suspended_at, and deleted_at
  -> If visible: render read-only globe
  -> If hidden/suspended/missing: render unavailable state
```

The visible public globe uses current live profile data:

- active uploaded photos
- captions and locations
- hero selections
- hero framing transforms
- deleted photos excluded

The public route should not include edit, import, delete, or management controls.

### Admin View

```text
Admin opens /admin
  -> Server checks Supabase session and admin role
  -> Admin page lists users/profiles/photo counts/storage usage/status
  -> Admin can hide or suspend public profile display
  -> Admin can run cleanup for failed/deleted/orphaned image objects
```

The admin page is a utilitarian operations surface. It should not change the
first-screen globe experience for regular users.

## API Surface

Recommended route shape:

```text
GET    /api/profile
PATCH  /api/profile
POST   /api/photos
PATCH  /api/photos/:id
DELETE /api/photos/:id
PATCH  /api/presentation
GET    /api/public/profiles/:slug
GET    /api/admin/profiles
PATCH  /api/admin/profiles/:id
POST   /api/admin/storage-cleanup
```

The existing local `/api/profile` and `/api/photo` routes can remain for local
development. The cloud backend should use the same UI contract while moving
cloud-specific behavior into `@beenthere/storage-cloud` and app route handlers.

## Public Image Delivery

Public profile images should use an image proxy route by default.

Recommended beta behavior:

```text
Proxy route
  /api/public/photos/:photoId
  -> server checks public visibility each request
  -> server streams or redirects to R2
```

Avoid long-lived public signed URLs for beta. If a user hides their globe, old
long-lived image URLs could keep working until expiry. A proxy route revokes
access immediately.

Public CDN URLs are not the v1 recommendation because hiding a profile would not
make already-known image URLs private.

## Error Handling And Guardrails

Auth/session:

- Expired sessions return a clear sign-in state.
- Owner writes always verify the authenticated user server-side.
- Admin APIs always verify both session and role.

Upload:

- Validate MIME type and maximum file size before R2 write.
- Enforce beta quotas: 10 MB per original photo and 500 active photos per
  profile.
- Mark rows `active` only after R2 write and variant generation succeed.
- Mark rows `failed` if upload or processing fails.

Delete:

- Mark deleted photos in Supabase before attempting R2 cleanup.
- Exclude deleted photos from owner and public profile assembly.
- Clean stale hero references in the same logical operation.
- Allow admin cleanup to retry failed object deletion.

Presentation:

- Reject hero references to missing, deleted, or out-of-place photos.
- Reject invalid framing values.
- Keep country and subdivision presentation independent.

Public visibility:

- `public_visible = false` makes `/u/:slug` return a hidden state.
- `suspended_at` overrides owner visibility.
- Public APIs never expose private account metadata.

Cost controls:

- Serve display/thumb variants in globe views instead of original uploads.
- Keep Supabase storage metadata-only.
- Track `byte_size` per photo for admin storage reporting.
- Prefer R2 for photo object storage.

## Testing And Verification

Unit tests:

- Assemble Supabase-style rows into `TravelerProfile`.
- Decompose `TravelerProfile` into scoped profile/photo/presentation updates.
- Validate presentation references.
- Validate framing bounds.
- Exclude failed/deleted photos from profile assembly.
- Remove hero references when deleting photos.
- Filter hidden, suspended, deleted, and missing public profiles.

API tests:

- Unauthenticated users cannot read or write owner APIs.
- User A cannot read or write User B's profile.
- Public route can read only visible profiles.
- Admin route requires admin role.
- Photo upload handles failed R2 writes by marking rows failed.
- Photo delete handles R2 delete failure without corrupting profile state.

UI/browser checks:

- Owner sign-in reaches editable globe.
- Upload/import still opens the existing management flow.
- Owner caption/location edits persist and reload.
- Owner hero framing persists and reloads.
- Public `/u/:slug` renders the same globe read-only.
- Hidden public profile does not render the globe.
- Admin page lists profiles and can hide/suspend public display.

Build verification:

```text
pnpm --filter @beenthere/ui test
pnpm --filter @beenthere/web test
pnpm build
```

`pnpm lint` exists in `package.json`, but `pnpm build` is the reliable
project-wide check for this repository until linting is repaired.

## Implementation Notes

- Keep generated and large geo files unchanged.
- Preserve the app-router structure.
- Add route-specific cloud/public/admin UI under `app/`.
- Keep reusable profile and globe logic under `packages/ui`.
- Keep cloud storage/provider code under `packages/storage-cloud`.
- Continue using structured geo and profile utilities rather than duplicating
  parsing inside React components.
- Update `docs/UX_UI_PRESERVATION_SPEC.md` only if multi-user work changes the
  intended UX baseline.
