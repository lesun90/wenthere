const assert = require('node:assert/strict')
const path = require('node:path')
const { installTypeScriptLoader } = require('../../ui/test/helpers/load-ts.cjs')

const restore = installTypeScriptLoader()

try {
  const {
    IMAGE_VARIANTS,
    buildR2ObjectKeys,
    getCloudEnvironment,
    missingCloudEnvironment,
    planImageVariants,
    publicPhotoCacheHeaders,
  } = require(path.resolve(__dirname, '../server.ts'))

  assert.deepEqual(missingCloudEnvironment({}), [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
  ])

  const env = getCloudEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    R2_ACCOUNT_ID: 'account',
    R2_ACCESS_KEY_ID: 'access',
    R2_SECRET_ACCESS_KEY: 'secret',
    R2_BUCKET: 'bucket',
  })

  assert.equal(env.supabaseUrl, 'https://example.supabase.co')
  assert.equal(env.r2Endpoint, 'https://account.r2.cloudflarestorage.com')

  assert.deepEqual(IMAGE_VARIANTS.display, {
    name: 'display',
    longEdge: 2048,
    webpQuality: 86,
    jpegQuality: 88,
  })
  assert.deepEqual(IMAGE_VARIANTS.thumb, {
    name: 'thumb',
    longEdge: 512,
    webpQuality: 82,
    jpegQuality: 85,
  })

  assert.deepEqual(planImageVariants({ width: 4000, height: 2600 }), [
    { name: 'display', width: 2048, height: 1331, format: 'webp', stripMetadata: true, quality: 86 },
    { name: 'thumb', width: 512, height: 333, format: 'webp', stripMetadata: true, quality: 82 },
  ])
  assert.deepEqual(planImageVariants({ width: 640, height: 480 })[0], {
    name: 'display',
    width: 640,
    height: 480,
    format: 'webp',
    stripMetadata: true,
    quality: 86,
  })

  const keys = buildR2ObjectKeys({
    profileId: 'profile-1',
    photoId: 'photo-1',
    randomId: 'abcdef1234567890',
    extension: 'jpg',
  })
  assert.deepEqual(keys, {
    original: 'profiles/profile-1/photos/photo-1/abcdef1234567890/original.jpg',
    display: 'profiles/profile-1/photos/photo-1/abcdef1234567890/display.webp',
    thumb: 'profiles/profile-1/photos/photo-1/abcdef1234567890/thumb.webp',
  })

  assert.deepEqual(publicPhotoCacheHeaders({ visible: true }), {
    'Cache-Control': 'private, max-age=0, must-revalidate',
  })
  assert.deepEqual(publicPhotoCacheHeaders({ visible: false }), {
    'Cache-Control': 'no-store',
  })
} finally {
  restore()
}
