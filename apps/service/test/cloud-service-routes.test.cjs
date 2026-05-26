const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

function source(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8')
}

const ownerProfileRoute = source('app/api/profile/route.ts')
const photosRoute = source('app/api/photos/route.ts')
const photoIdRoute = source('app/api/photos/[id]/route.ts')
const presentationRoute = source('app/api/presentation/route.ts')
const publicProfileRoute = source('app/api/public/profiles/[slug]/route.ts')
const publicPhotoRoute = source('app/api/public/photos/[photoId]/route.ts')
const adminProfilesRoute = source('app/api/admin/profiles/route.ts')
const adminCleanupRoute = source('app/api/admin/storage-cleanup/route.ts')
const publicPage = source('app/u/[slug]/page.tsx')
const adminPage = source('app/admin/page.tsx')
const adminConsole = source('app/admin/AdminConsole.tsx')
const adminAuth = source('app/api/admin/auth.ts')
const homePage = source('app/page.tsx')
const cloudExperience = source('app/CloudProfileExperience.tsx')
const migration = source('supabase/migrations/202605260001_multi_user_cloud.sql')
const nextConfig = source('next.config.ts')
const dockerfile = source('Dockerfile')
const compose = source('docker-compose.yml')
const composeOverride = source('docker-compose.override.yml')
const composeProd = source('docker-compose.prod.yml')

for (const route of [
  ownerProfileRoute,
  photosRoute,
  photoIdRoute,
  presentationRoute,
  publicProfileRoute,
  publicPhotoRoute,
  adminProfilesRoute,
  adminCleanupRoute,
]) {
  assert.match(route, /runtime = 'nodejs'/, 'cloud API routes must use the Node.js runtime')
  assert.match(route, /cloudUnavailable/, 'cloud API routes should fail clearly when credentials are absent')
}

assert.match(ownerProfileRoute, /GET/)
assert.match(ownerProfileRoute, /PATCH/)
assert.match(photosRoute, /POST/)
assert.match(photoIdRoute, /PATCH/)
assert.match(photoIdRoute, /DELETE/)
assert.match(presentationRoute, /PATCH/)
assert.match(publicProfileRoute, /GET/)
assert.match(publicPhotoRoute, /GET/)
assert.match(adminProfilesRoute, /GET/)
assert.match(adminProfilesRoute, /PATCH/)
assert.match(adminCleanupRoute, /POST/)
assert.match(adminProfilesRoute, /verifyAdminRequest/)
assert.match(adminProfilesRoute, /profiles/)
assert.match(adminProfilesRoute, /photos/)
assert.match(adminProfilesRoute, /public_visible/)
assert.match(adminProfilesRoute, /suspended_at/)
assert.match(adminCleanupRoute, /DeleteObjectsCommand/)
assert.match(adminCleanupRoute, /dryRun/)

assert.match(publicPage, /read-only/i)
assert.match(adminConsole, /Beta operations/i)
assert.match(adminPage, /AdminConsole/)
assert.match(adminConsole, /sessionStorage/)
assert.match(adminConsole, /Authorization/)
assert.match(adminConsole, /filter/)
assert.match(adminConsole, /runCleanup/)
assert.match(adminConsole, /toggleVisibility/)
assert.match(adminConsole, /toggleSuspension/)
assert.match(adminAuth, /auth\.getUser/)
assert.match(adminAuth, /admin_users/)
assert.doesNotMatch(homePage, /Phase 2 not yet implemented/)
assert.match(homePage, /CloudProfileExperience/)
assert.match(cloudExperience, /CloudProfileStore/)

for (const table of ['profiles', 'photos', 'profile_presentation', 'admin_users', 'beta_users']) {
  assert.match(migration, new RegExp(`create table public\\.${table}`), `migration should create ${table}`)
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`), `${table} needs RLS`)
}

assert.match(migration, /check \(status in \('uploading', 'active', 'failed', 'deleted'\)\)/)
assert.match(migration, /create unique index profiles_slug_key/)
assert.match(migration, /create index photos_profile_status_deleted_idx/)
assert.match(migration, /public_visible = true/)
assert.match(migration, /suspended_at is null/)
assert.match(migration, /deleted_at is null/)
assert.match(migration, /admin-created beta users only/)

assert.match(nextConfig, /output:\s*'standalone'/)
assert.match(dockerfile, /FROM node:22-alpine AS base/)
assert.match(dockerfile, /COPY pnpm-workspace\.yaml package\.json pnpm-lock\.yaml tsconfig\.base\.json \.\//)
assert.match(dockerfile, /pnpm --filter @beenthere\/service build/)
assert.match(dockerfile, /COPY --from=builder \/app\/apps\/service\/\.next\/standalone/)
assert.match(dockerfile, /EXPOSE 3001/)
assert.match(dockerfile, /CMD \["node", "apps\/service\/server\.js"\]/)

assert.match(compose, /dockerfile: apps\/service\/Dockerfile/)
assert.match(compose, /"3001:3001"/)
assert.match(composeOverride, /target: dev/)
assert.match(composeOverride, /NEXT_PUBLIC_SUPABASE_URL: \$\{NEXT_PUBLIC_SUPABASE_URL:-\}/)
assert.match(composeOverride, /R2_BUCKET: \$\{R2_BUCKET:-\}/)
assert.match(composeOverride, /"9230:9230"/)
assert.match(composeProd, /target: prod/)
assert.match(composeProd, /NODE_ENV: production/)
