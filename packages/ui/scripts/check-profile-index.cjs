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
    { id: 'sample-usa-ca-2', url: '/sample/11.jpg', caption: 'California two', location: { countryCode: 'USA', subdivisionCode: 'USA-3521' } },
    { id: 'sample-usa-tx-1', url: '/sample/12.jpg', caption: 'Texas one', location: { countryCode: 'USA', subdivisionCode: 'USA-3536' } },
    { id: 'sample-chn-gd-1', url: '/sample/20.jpg', caption: 'Guangdong one', location: { countryCode: 'CHN', subdivisionCode: 'CHN-1180' } },
    { id: 'sample-vnm-dn-1', url: '/sample/30.jpg', caption: 'Da Nang one', location: { countryCode: 'VNM', subdivisionCode: 'VNM-491' } },
  ],
  presentation: {
    countryHeroes: {
      USA: { photoId: 'sample-usa-ca-1' },
      CHN: { photoId: 'sample-chn-gd-1' },
      VNM: { photoId: 'sample-vnm-dn-1' },
    },
    subdivisionHeroes: {
      'USA-3521': { photoId: 'sample-usa-ca-1' },
      'USA-3536': { photoId: 'sample-usa-tx-1' },
      'CHN-1180': { photoId: 'sample-chn-gd-1' },
      'VNM-491': { photoId: 'sample-vnm-dn-1' },
    },
  },
}

try {
  const {
    addPhoto,
    buildProfileIndex,
    removePhoto,
    updatePhoto,
    validateProfile,
  } = require(path.join(packageRoot, 'lib/geodata.ts'))

  const sampleIndex = buildProfileIndex(sampleProfile)
  assert.equal(sampleProfile.locations, undefined, 'profile should not carry derived geo metadata')
  assert.equal(sampleIndex.stats.countryCount, 3, 'country count')
  assert.equal(sampleIndex.stats.placeCount, 4, 'place count')
  assert.equal(sampleIndex.stats.photoCount, 5, 'photo count')
  assert.equal(sampleIndex.countrySummariesByCode.USA.heroPic, '/sample/10.jpg', 'USA hero')
  assert.equal(sampleIndex.countrySummariesByCode.USA.name, 'United States', 'USA name')
  assert.equal(sampleIndex.subdivisionSummariesByCode['USA-3521'].heroPic, '/sample/10.jpg', 'California hero')
  assert.equal(sampleIndex.subdivisionSummariesByCode['USA-3521'].name, 'California', 'California name')
  assert.deepEqual(
    sampleIndex.photosBySubdivisionCode['USA-3521'].map(photo => photo.url),
    ['/sample/10.jpg', '/sample/11.jpg'],
    'subdivision gallery order',
  )
  assert.deepEqual(
    Object.keys(sampleProfile.photos[0].location).sort(),
    ['countryCode', 'subdivisionCode'],
    'photo locations should expose stable codes only',
  )

  const nonRenderablePhoto = {
    id: 'check-non-renderable',
    url: '/sample/non-renderable.jpg',
    caption: 'Non-renderable test memory',
    location: {
      countryCode: 'USA',
      subdivisionCode: 'SYN-USA-CHECK',
      renderable: false,
    },
  }
  const withNonRenderable = addPhoto(sampleProfile, nonRenderablePhoto)
  const nonRenderableIndex = buildProfileIndex(withNonRenderable)
  assert.equal(nonRenderableIndex.subdivisionSummariesByCode['SYN-USA-CHECK'].renderable, false)
  assert.equal(nonRenderableIndex.renderableSubdivisionCodes.includes('SYN-USA-CHECK'), false)
  assert.equal(nonRenderableIndex.countrySummariesByCode.USA.photoCount, 4)
  assert.equal(
    nonRenderableIndex.countrySummariesByCode.USA.renderablePlaceCount,
    sampleIndex.countrySummariesByCode.USA.renderablePlaceCount,
    'non-renderable subdivisions should not increase country renderable place count',
  )

  const removedHero = removePhoto(sampleProfile, 'sample-usa-ca-1')
  const removedHeroIndex = buildProfileIndex(removedHero)
  assert.equal(removedHeroIndex.subdivisionSummariesByCode['USA-3521'].heroPic, '/sample/11.jpg')
  assert.ok(
    validateProfile(removedHero).some(issue => issue.includes('sample-usa-ca-1')),
    'removed presentation hero should be reported',
  )

  const movedHero = updatePhoto(sampleProfile, 'sample-usa-ca-1', {
    location: {
      countryCode: 'USA',
      subdivisionCode: 'USA-3536',
    },
  })
  const movedHeroIndex = buildProfileIndex(movedHero)
  assert.equal(movedHeroIndex.subdivisionSummariesByCode['USA-3521'].heroPic, '/sample/11.jpg')
  assert.ok(
    validateProfile(movedHero).some(issue => issue.includes('USA-3521') && issue.includes('sample-usa-ca-1')),
    'moved presentation hero should be reported',
  )

  const countryOnlyIndex = buildProfileIndex({
    id: 'country-only-check',
    name: 'Country Only Check',
    photos: [{
      id: 'country-only-photo',
      url: '/sample/country-only.jpg',
      caption: 'Country-only photo should not create a visited country',
      location: {
        countryCode: 'CHN',
      },
    }],
  })
  assert.equal(countryOnlyIndex.stats.countryCount, 0, 'country-only photos should not create visited countries')
  assert.equal(countryOnlyIndex.countrySummariesByNumericId['156'], undefined)

  const mismatchedSubdivision = updatePhoto(sampleProfile, 'sample-usa-ca-1', {
    location: {
      countryCode: 'CHN',
      subdivisionCode: 'USA-3521',
    },
  })
  assert.ok(
    validateProfile(mismatchedSubdivision).some(issue =>
      issue.includes('USA-3521') && issue.includes('CHN') && issue.includes('USA'),
    ),
    'subdivision/country mismatch should be reported from shared geo metadata',
  )
} finally {
  if (originalTs) {
    require.extensions['.ts'] = originalTs
  } else {
    delete require.extensions['.ts']
  }
}
