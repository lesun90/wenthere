const assert = require('node:assert/strict')
const path = require('node:path')
const { installTypeScriptLoader } = require('./helpers/load-ts.cjs')

const restore = installTypeScriptLoader()

const sampleProfile = {
  id: 'sample-traveler',
  name: 'Sample Traveler',
  photos: [
    { id: 'sample-usa-ca-1', url: '/sample/10.jpg', caption: 'California one', takenAt: '2024-01-01', location: { countryCode: 'USA', subdivisionCode: 'USA-3521' } },
    { id: 'sample-usa-tx-1', url: '/sample/12.jpg', caption: 'Texas one', location: { countryCode: 'USA', subdivisionCode: 'USA-3536' } },
  ],
  presentation: {
    countryHeroes: { USA: { photoId: 'sample-usa-ca-1' } },
    subdivisionHeroes: { 'USA-3521': { photoId: 'sample-usa-ca-1' } },
  },
}

try {
  const {
    appendLocalPhotos,
    applyPhotoEditDraft,
    removeStoredPhoto,
    setCountryFraming,
    setSubdivisionFraming,
  } = require(path.resolve(__dirname, '../lib/profile-store/mutations.ts'))

  const imported = appendLocalPhotos(sampleProfile, [
    {
      id: 'local-photo-1',
      blobKey: 'photo-sample-traveler-local-photo-1',
      objectUrl: 'blob:http://localhost/local-photo-1',
      mimeType: 'image/jpeg',
      fileName: 'california.jpg',
    },
    {
      id: 'local-photo-2',
      blobKey: 'photo-sample-traveler-local-photo-2',
      objectUrl: 'blob:http://localhost/local-photo-2',
      mimeType: 'image/png',
      fileName: '   .png',
    },
    {
      id: 'local-photo-3',
      blobKey: 'photo-sample-traveler-local-photo-3',
      objectUrl: 'blob:http://localhost/local-photo-3',
      mimeType: 'image/webp',
    },
  ])

  assert.equal(imported.photos.length, sampleProfile.photos.length + 3)
  assert.equal(imported.photos.find(photo => photo.id === 'local-photo-1').caption, 'california')
  assert.equal(imported.photos.find(photo => photo.id === 'local-photo-2').caption, 'Untitled memory')
  assert.equal(imported.photos.find(photo => photo.id === 'local-photo-3').caption, 'Untitled memory')
  assert.deepEqual(imported.photos.find(photo => photo.id === 'local-photo-1').location, { countryCode: '' })
  assert.deepEqual(imported.photos.find(photo => photo.id === 'local-photo-1').source, {
    kind: 'localBlob',
    key: 'photo-sample-traveler-local-photo-1',
    mimeType: 'image/jpeg',
    fileName: 'california.jpg',
  })

  const edited = applyPhotoEditDraft(imported, 'local-photo-1', {
    caption: 'Golden hour coastline',
    takenAt: '2026-05-22',
    countryName: 'United States',
    subdivisionName: 'California',
  })
  const editedPhoto = edited.photos.find(photo => photo.id === 'local-photo-1')
  assert.equal(editedPhoto.caption, 'Golden hour coastline')
  assert.equal(editedPhoto.takenAt, '2026-05-22')
  assert.deepEqual(editedPhoto.location, {
    countryCode: 'USA',
    subdivisionCode: 'USA-3521',
  })

  const firstCountryPhoto = applyPhotoEditDraft({
    id: 'first-country-photo-check',
    name: 'First Country Photo Check',
    photos: [
      {
        id: 'local-photo-first',
        url: 'blob:http://localhost/local-photo-first',
        caption: 'First local photo',
        location: { countryCode: '' },
      },
    ],
    presentation: {
      countryHeroes: {},
      subdivisionHeroes: {},
    },
  }, 'local-photo-first', {
    caption: 'First country memory',
    takenAt: '',
    countryName: 'United States',
    subdivisionName: 'California',
  })
  assert.deepEqual(firstCountryPhoto.presentation.countryHeroes.USA, {
    photoId: 'local-photo-first',
  })

  const clearedDate = applyPhotoEditDraft(edited, 'local-photo-1', {
    caption: 'No date',
    takenAt: '',
    countryName: ' Atlantis ',
    subdivisionName: ' Floating District ',
  }).photos.find(photo => photo.id === 'local-photo-1')
  assert.equal(clearedDate.takenAt, undefined)
  assert.deepEqual(clearedDate.location, {
    countryCode: 'Atlantis',
    subdivisionCode: 'Floating District',
  })
  assert.deepEqual(
    applyPhotoEditDraft(imported, 'missing-photo', {
      caption: 'No change',
      takenAt: '',
      countryName: 'United States',
      subdivisionName: 'California',
    }).photos,
    imported.photos,
    'editing a missing photo should preserve existing photo data',
  )

  const framed = setSubdivisionFraming(
    setCountryFraming(edited, 'USA', 'local-photo-1', { x: 0.1, y: -0.2, scale: 1.4 }),
    'USA-3521',
    'local-photo-1',
    { x: -0.1, y: 0.2, scale: 1.2 },
  )
  assert.deepEqual(framed.presentation.countryHeroes.USA, {
    photoId: 'local-photo-1',
    framing: { x: 0.1, y: -0.2, scale: 1.4 },
  })
  assert.deepEqual(framed.presentation.subdivisionHeroes['USA-3521'], {
    photoId: 'local-photo-1',
    framing: { x: -0.1, y: 0.2, scale: 1.2 },
  })

  const removed = removeStoredPhoto(framed, 'local-photo-1')
  assert.equal(removed.photos.some(photo => photo.id === 'local-photo-1'), false)
  assert.equal(removed.presentation.countryHeroes.USA, undefined)
  assert.equal(removed.presentation.subdivisionHeroes['USA-3521'], undefined)

  const withoutPresentation = removeStoredPhoto({ id: 'no-presentation', name: 'No Presentation', photos: [] }, 'missing')
  assert.deepEqual(withoutPresentation.presentation, { countryHeroes: {}, subdivisionHeroes: {} })
} finally {
  restore()
}
