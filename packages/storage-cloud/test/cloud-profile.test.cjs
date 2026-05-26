const assert = require('node:assert/strict')
const path = require('node:path')
const { installTypeScriptLoader } = require('../../ui/test/helpers/load-ts.cjs')

const restore = installTypeScriptLoader()

try {
  const {
    ACTIVE_PHOTO_STATUSES,
    assembleTravelerProfile,
    cleanPresentationForDeletedPhoto,
    decomposeTravelerProfile,
    isBetaInviteAllowed,
    profileStorageUsage,
    validateFraming,
    validatePresentation,
  } = require(path.resolve(__dirname, '../index.ts'))

  const profileRow = {
    id: 'profile-1',
    owner_id: 'user-1',
    slug: 'sasha',
    display_name: 'Sasha Roams',
    public_visible: true,
    suspended_at: null,
    deleted_at: null,
    created_at: '2026-05-26T00:00:00Z',
    updated_at: '2026-05-26T00:00:00Z',
  }

  const photos = [
    {
      id: 'photo-active',
      profile_id: 'profile-1',
      original_r2_key: 'profiles/profile-1/original/photo-active',
      display_r2_key: 'profiles/profile-1/display/photo-active.webp',
      thumb_r2_key: 'profiles/profile-1/thumb/photo-active.webp',
      caption: 'California coast',
      taken_at: '2026-05-22',
      country_code: 'USA',
      subdivision_code: 'USA-3521',
      mime_type: 'image/jpeg',
      byte_size: 1200,
      width: 2000,
      height: 1300,
      status: 'active',
      upload_completed_at: '2026-05-26T00:00:00Z',
      deleted_at: null,
      created_at: '2026-05-26T00:00:00Z',
      updated_at: '2026-05-26T00:00:00Z',
    },
    {
      id: 'photo-uploading',
      profile_id: 'profile-1',
      original_r2_key: 'profiles/profile-1/original/photo-uploading',
      display_r2_key: null,
      thumb_r2_key: null,
      caption: 'Still processing',
      taken_at: null,
      country_code: 'FRA',
      subdivision_code: null,
      mime_type: 'image/png',
      byte_size: 500,
      width: null,
      height: null,
      status: 'uploading',
      upload_completed_at: null,
      deleted_at: null,
      created_at: '2026-05-26T00:00:00Z',
      updated_at: '2026-05-26T00:00:00Z',
    },
    {
      id: 'photo-deleted',
      profile_id: 'profile-1',
      original_r2_key: 'profiles/profile-1/original/photo-deleted',
      display_r2_key: 'profiles/profile-1/display/photo-deleted.webp',
      thumb_r2_key: 'profiles/profile-1/thumb/photo-deleted.webp',
      caption: 'Deleted memory',
      taken_at: null,
      country_code: 'USA',
      subdivision_code: 'USA-3536',
      mime_type: 'image/jpeg',
      byte_size: 800,
      width: 1200,
      height: 900,
      status: 'deleted',
      upload_completed_at: '2026-05-26T00:00:00Z',
      deleted_at: '2026-05-26T01:00:00Z',
      created_at: '2026-05-26T00:00:00Z',
      updated_at: '2026-05-26T01:00:00Z',
    },
  ]

  const presentationRow = {
    profile_id: 'profile-1',
    country_heroes: {
      USA: { photoId: 'photo-active', framing: { x: 0.2, y: -0.2, scale: 1.4 } },
      FRA: { photoId: 'photo-uploading' },
    },
    subdivision_heroes: {
      'USA-3521': { photoId: 'photo-active' },
      'USA-3536': { photoId: 'photo-deleted' },
    },
    updated_at: '2026-05-26T00:00:00Z',
  }

  const assembled = assembleTravelerProfile({
    profile: profileRow,
    photos,
    presentation: presentationRow,
    imageUrlFor: row => `/api/public/photos/${row.id}`,
  })

  assert.equal(assembled.id, 'profile-1')
  assert.equal(assembled.name, 'Sasha Roams')
  assert.equal(assembled.photos.length, 1)
  assert.deepEqual(assembled.photos[0], {
    id: 'photo-active',
    url: '/api/public/photos/photo-active',
    caption: 'California coast',
    takenAt: '2026-05-22',
    location: { countryCode: 'USA', subdivisionCode: 'USA-3521' },
    source: {
      kind: 'cloudObject',
      key: 'profiles/profile-1/display/photo-active.webp',
      mimeType: 'image/jpeg',
    },
  })
  assert.deepEqual(assembled.presentation.countryHeroes, {
    USA: { photoId: 'photo-active', framing: { x: 0.2, y: -0.2, scale: 1.4 } },
  })
  assert.deepEqual(assembled.presentation.subdivisionHeroes, {
    'USA-3521': { photoId: 'photo-active' },
  })

  assert.deepEqual(ACTIVE_PHOTO_STATUSES, ['active'])
  assert.deepEqual(validateFraming({ x: -1, y: 1, scale: 3 }), [])
  assert.deepEqual(validateFraming({ x: -1.1, y: 0, scale: 1 }), ['framing.x must be between -1 and 1.'])
  assert.deepEqual(validateFraming({ x: 0, y: 1.1, scale: 1 }), ['framing.y must be between -1 and 1.'])
  assert.deepEqual(validateFraming({ x: 0, y: 0, scale: 3.1 }), ['framing.scale must be between 1 and 3.'])

  assert.deepEqual(validatePresentation(assembled), [])
  assert.deepEqual(
    validatePresentation({
      ...assembled,
      presentation: { countryHeroes: { CAN: { photoId: 'photo-active' } } },
    }),
    ['Country "CAN" references photo "photo-active" outside the country.'],
  )

  const cleaned = cleanPresentationForDeletedPhoto(presentationRow, 'photo-active')
  assert.equal(cleaned.country_heroes.USA, undefined)
  assert.equal(cleaned.subdivision_heroes['USA-3521'], undefined)
  assert.equal(cleaned.country_heroes.FRA.photoId, 'photo-uploading')

  assert.equal(profileStorageUsage(photos), 2500)
  assert.equal(isBetaInviteAllowed({ userId: 'user-1', adminCreatedUserIds: ['user-1'] }), true)
  assert.equal(isBetaInviteAllowed({ userId: 'user-2', adminCreatedUserIds: ['user-1'] }), false)

  assert.deepEqual(decomposeTravelerProfile(assembled), {
    profile: {
      id: 'profile-1',
      display_name: 'Sasha Roams',
    },
    photos: [
      {
        id: 'photo-active',
        caption: 'California coast',
        taken_at: '2026-05-22',
        country_code: 'USA',
        subdivision_code: 'USA-3521',
      },
    ],
    presentation: {
      profile_id: 'profile-1',
      country_heroes: {
        USA: { photoId: 'photo-active', framing: { x: 0.2, y: -0.2, scale: 1.4 } },
      },
      subdivision_heroes: {
        'USA-3521': { photoId: 'photo-active' },
      },
    },
  })
} finally {
  restore()
}
