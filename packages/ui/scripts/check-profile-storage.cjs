const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const packageRoot = path.resolve(__dirname, '..')
const originalTs = require.extensions['.ts']

require.extensions['.ts'] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  }).outputText

  module._compile(output, filename)
}

const sampleProfile = {
  id: 'sample-traveler',
  name: 'Sample Traveler',
  photos: [
    { id: 'sample-usa-ca-1', url: '/sample/10.jpg', caption: 'California one', location: { countryCode: 'USA', subdivisionCode: 'USA-3521' } },
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
  } = require(path.join(packageRoot, 'lib/profile-store/mutations.ts'))

  const imported = appendLocalPhotos(sampleProfile, [{
    id: 'local-photo-1',
    blobKey: 'photo-sample-traveler-local-photo-1',
    objectUrl: 'blob:http://localhost/local-photo-1',
    mimeType: 'image/jpeg',
    fileName: 'california.jpg',
  }])

  const localPhoto = imported.photos.find(photo => photo.id === 'local-photo-1')
  assert.ok(localPhoto, 'local photo should be appended')
  assert.equal(localPhoto.url, 'blob:http://localhost/local-photo-1')
  assert.equal(localPhoto.caption, 'california')
  assert.deepEqual(localPhoto.location, { countryCode: '' })
  assert.deepEqual(localPhoto.source, {
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
} finally {
  if (originalTs) {
    require.extensions['.ts'] = originalTs
  } else {
    delete require.extensions['.ts']
  }
}
