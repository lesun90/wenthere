# GitHub Storage Design

## Purpose

Replace IndexedDB offline storage with a private GitHub repository as the primary store
for the user's `TravelerProfile` and photo files. Configured via `.env.local`, with no
login UI — the owner authenticates via a secret query param. Visitors get a read-only
view of the globe.

## Goals

- Persist profile JSON and photo files in a private GitHub repo.
- Sync automatically across devices (any device with the app URL sees the same data).
- Owner-only writes gated by a `?edit=<secret>` URL param.
- Visitors can view the globe and photos without any authentication.
- Replace IndexedDB entirely — no hybrid sync, no conflict resolution.

## Non-Goals

- No OTP or OAuth login (deferred to a future phase).
- No multi-user accounts.
- No offline write support (internet required to make changes).
- No migration tool from existing IndexedDB data.
- No visual redesign.

## Configuration

Three environment variables in `.env.local`:

```
GITHUB_TOKEN=ghp_...                        # PAT with repo scope (read + write)
GITHUB_STORAGE_REPO=lesun90/beenthere-data  # private repo for data
GITHUB_OWNER_SECRET=some-long-secret        # controls who can write
```

`GITHUB_TOKEN` and `GITHUB_OWNER_SECRET` are server-side only and never reach the browser.
`GITHUB_STORAGE_REPO` is also server-side.

An `.env.example` file documents these variables without values.

## Storage Repo Layout

```
beenthere-data/          ← private GitHub repo
├── profile.json         ← serialized TravelerProfile
└── photos/
    └── <blobKey>        ← e.g. photo-abc123-xyz789 (filename = blobKey)
```

`profile.json` uses the existing `TravelerProfile` shape from `lib/types.ts` — no new
schema. Photo filenames match `TravelPhoto.source.key` exactly, so no mapping layer is
needed.

**BlobKey format:** The current IndexedDB format uses colons (`photo:profileId:photoId`).
For GitHub storage, switch to hyphens (`photo-profileId-photoId`) so blobKeys are safe
as both GitHub filenames and URL path segments in `/api/photo/<key>`. The key generator
in `ProfileProvider` must be updated accordingly.

Imported photos store `url: '/api/photo/<key>'` directly in `profile.json`. This URL is
stable across devices and deployments.

## API Routes

Five Next.js route handlers. All GitHub API calls are server-side using `GITHUB_TOKEN`.

| File | Method | Auth | Purpose |
|---|---|---|---|
| `app/api/profile/route.ts` | `GET` | none | Fetch `profile.json` from GitHub |
| `app/api/profile/route.ts` | `PUT` | owner | Write updated `profile.json` to GitHub |
| `app/api/photo/route.ts` | `POST` | owner | Upload photo file to `photos/<key>` |
| `app/api/photo/[key]/route.ts` | `GET` | none | Proxy photo bytes from GitHub |
| `app/api/photo/[key]/route.ts` | `DELETE` | owner | Delete `photos/<key>` from GitHub |

Read routes (`GET profile`, `GET photo`) are open to all visitors. Write routes check the
`x-owner-secret` request header against `process.env.GITHUB_OWNER_SECRET`. A mismatch
returns `403`.

The photo proxy route fetches the raw file via GitHub Contents API and streams it back
with the correct `Content-Type` header. This allows private repo images to display in
the browser without exposing `GITHUB_TOKEN`.

Upload uses the GitHub Contents API (base64-encoded body). Files are expected to be
personal travel photos — typically 1–15 MB — which is within GitHub's 100 MB per-file
limit and acceptable for personal use.

## Owner Authentication

No login page. The owner bookmarks a URL with the secret:

```
https://yourapp.com/demo?edit=some-long-secret
```

On mount, `ProfileProvider` reads `?edit=` from the URL, stores the value in
`sessionStorage`, and derives `isOwner: boolean`. Write API calls include the secret
as an `x-owner-secret` header. The secret is never returned in any API response.

Visitors who access the app without `?edit=` get a read-only globe. The import, edit,
and delete controls in `PhotoManagementDrawer` are hidden when `isOwner` is false.

**Security note:** The secret appears in browser history and could be leaked via URL
sharing. This is acceptable for personal use on trusted devices. OTP authentication is
the recommended upgrade path for a future phase.

## `GitHubProfileStore`

New file: `lib/profile-store/github-store.ts`

```ts
class GitHubProfileStore {
  constructor(private ownerSecret: string | null) {}

  async getActiveProfile(): Promise<TravelerProfile | null>
  // GET /api/profile

  async saveActiveProfile(profile: TravelerProfile): Promise<void>
  // PUT /api/profile  { x-owner-secret }

  async putPhotoBlob(key: string, file: File): Promise<void>
  // POST /api/photo  multipart: { key, file }  { x-owner-secret }

  async deletePhotoBlob(key: string): Promise<void>
  // DELETE /api/photo/<key>  { x-owner-secret }
}
```

`getPhotoBlob()` is not implemented — photos are served directly by the proxy route,
so nothing needs to be fetched into browser memory.

## `ProfileProvider` Changes

**Remove:**
- `resolveProfileUrls()` and all object URL creation/revocation logic.
- `objectUrlsRef` and `revokeObjectUrls()`.
- `storageStatus: 'memory-fallback'` branch (GitHub is available or throws).
- `IndexedDbProfileStore` import and usage.
- The `storedProfile` / `resolvedProfile` two-state split collapses into one.

**Add:**
- On mount: read `?edit=<secret>` from URL, persist to `sessionStorage`, derive `isOwner`.
- Instantiate `GitHubProfileStore(ownerSecret)` instead of `IndexedDbProfileStore`.
- Expose `isOwner: boolean` in `ProfileProviderValue`.

**Unchanged:**
- `importPhotos`, `editPhoto`, `deletePhoto`, `setCountryHero`, `setSubdivisionHero` —
  same signatures and logic.
- `unplacedPhotos`, `pendingEditPhotoId`, `profileIndex` — unchanged.
- Loading state while profile is fetched from GitHub on first render.

## Data Flow

### Load
1. `ProfileProvider` mounts, reads owner secret from URL/sessionStorage.
2. `GitHubProfileStore.getActiveProfile()` calls `GET /api/profile`.
3. Server fetches `profile.json` from GitHub using `GITHUB_TOKEN`.
4. If no `profile.json` exists yet, server seeds from `travelerProfile` and writes it.
5. Provider builds `profileIndex`, renders globe and drawer.

### Import Photos (owner only)
1. Owner drops files into drawer → `importPhotos(files)`.
2. For each file: `putPhotoBlob(key, file)` → `POST /api/photo` → GitHub Contents API.
3. `appendLocalPhotos` adds records with `url: '/api/photo/<key>'` and `source.kind: 'localBlob'`.
4. `saveActiveProfile` writes updated `profile.json` to GitHub.
5. Photos appear immediately; edit flow opens to set location.

### Edit / Delete / Hero
Same as existing `ProfileProvider` logic. After each mutation, `saveActiveProfile`
writes the updated profile JSON to GitHub via `PUT /api/profile`.

## Error Handling

- **Profile fetch fails:** Show full-screen error state with a retry button.
- **Photo upload fails:** Show error in drawer, keep failed photo in unplaced list so
  user can retry.
- **Write rejected (403):** Show "Not authorized" message. No silent failure.
- **GitHub rate limit:** Surface the GitHub error message in the drawer. Personal PATs
  have 5000 requests/hour — well above any personal use volume.

## Removed Modules

Once GitHub storage is live:
- `lib/profile-store/indexed-db-store.ts` — deleted.
- Object URL logic in `ProfileProvider` — deleted.
- `storageStatus: 'memory-fallback'` UI banner — deleted.

`lib/profile-store/mutations.ts` is unchanged (pure profile transformation functions,
storage-agnostic).

## Testing

- Unit-test `GitHubProfileStore` by mocking `fetch` — no real GitHub calls needed.
- Unit-test the five API routes by mocking the GitHub Contents API responses.
- Existing `lib/profile-store/mutations.ts` tests are unaffected.
- Manual smoke test: import a photo on one device, open on a second device, confirm it
  appears. Edit location, confirm it persists.
- Run `pnpm build` and `pnpm check:profile` before considering the milestone done.

## Future: OTP Authentication

The `?edit=secret` approach can be replaced with OTP-to-email without changing the API
route contract. The upgrade path:

1. Add `POST /api/auth/request-otp` and `POST /api/auth/verify-otp` routes.
2. Replace `x-owner-secret` header check with an HttpOnly signed cookie check.
3. Add a small login modal to the UI.
4. Remove the `?edit=` URL pattern.

`GitHubProfileStore` and the five storage routes do not need to change.
