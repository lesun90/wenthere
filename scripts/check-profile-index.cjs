const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const ts = require('typescript')

const repoRoot = path.resolve(__dirname, '..')
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

try {
  const { travelerProfile } = require(path.join(repoRoot, 'data/seed.ts'))
  const { stressTravelerProfile } = require(path.join(repoRoot, 'data/stressProfile.ts'))
  const {
    addPhoto,
    buildProfileIndex,
    removePhoto,
    updatePhoto,
    validateProfile,
  } = require(path.join(repoRoot, 'lib/geodata.ts'))

  const demoIndex = buildProfileIndex(travelerProfile)
  assert.equal(demoIndex.stats.countryCount, 3, 'demo country count')
  assert.equal(demoIndex.stats.placeCount, 13, 'demo place count')
  assert.equal(demoIndex.stats.photoCount, 26, 'demo photo count')
  assert.equal(demoIndex.countrySummariesByCode.USA.heroPic, '/demo/10.jpg', 'demo USA hero')
  assert.equal(demoIndex.subdivisionSummariesByCode['USA-3521'].heroPic, '/demo/10.jpg', 'demo California hero')
  assert.deepEqual(
    demoIndex.photosBySubdivisionCode['USA-3521'].map(photo => photo.url),
    ['/demo/10.jpg', '/demo/11.jpg'],
    'demo subdivision gallery order',
  )

  const nonRenderablePhoto = {
    id: 'check-non-renderable',
    url: '/demo/non-renderable.jpg',
    caption: 'Non-renderable test memory',
    location: {
      countryCode: 'USA',
      countryName: 'United States',
      countryNumericId: '840',
      subdivisionCode: 'SYN-USA-CHECK',
      subdivisionName: 'Synthetic check place',
      renderable: false,
    },
  }
  const withNonRenderable = addPhoto(travelerProfile, nonRenderablePhoto)
  const nonRenderableIndex = buildProfileIndex(withNonRenderable)
  assert.equal(nonRenderableIndex.subdivisionSummariesByCode['SYN-USA-CHECK'].renderable, false)
  assert.equal(nonRenderableIndex.renderableSubdivisionCodes.includes('SYN-USA-CHECK'), false)
  assert.equal(nonRenderableIndex.countrySummariesByCode.USA.photoCount, 11)
  assert.equal(
    nonRenderableIndex.countrySummariesByCode.USA.renderablePlaceCount,
    demoIndex.countrySummariesByCode.USA.renderablePlaceCount,
    'non-renderable subdivisions should not increase country renderable place count',
  )

  const removedHero = removePhoto(travelerProfile, 'demo-usa-ca-1')
  const removedHeroIndex = buildProfileIndex(removedHero)
  assert.equal(removedHeroIndex.subdivisionSummariesByCode['USA-3521'].heroPic, '/demo/11.jpg')
  assert.ok(
    validateProfile(removedHero).some(issue => issue.includes('demo-usa-ca-1')),
    'removed presentation hero should be reported',
  )

  const movedHero = updatePhoto(travelerProfile, 'demo-usa-ca-1', {
    location: {
      countryCode: 'USA',
      countryName: 'United States',
      countryNumericId: '840',
      subdivisionCode: 'USA-3536',
      subdivisionName: 'Texas',
    },
  })
  const movedHeroIndex = buildProfileIndex(movedHero)
  assert.equal(movedHeroIndex.subdivisionSummariesByCode['USA-3521'].heroPic, '/demo/11.jpg')
  assert.ok(
    validateProfile(movedHero).some(issue => issue.includes('USA-3521') && issue.includes('demo-usa-ca-1')),
    'moved presentation hero should be reported',
  )

  const countryOnlyIndex = buildProfileIndex({
    id: 'country-only-check',
    name: 'Country Only Check',
    photos: [{
      id: 'country-only-photo',
      url: '/demo/country-only.jpg',
      caption: 'Country-only photo should not create a visited country',
      location: {
        countryCode: 'CHN',
        countryName: 'China',
        countryNumericId: '156',
      },
    }],
  })
  assert.equal(countryOnlyIndex.stats.countryCount, 0, 'country-only photos should not create visited countries')
  assert.equal(countryOnlyIndex.countrySummariesByNumericId['156'], undefined)

  const stressIndex = buildProfileIndex(stressTravelerProfile)
  assert.equal(stressIndex.stats.countryCount, 34, 'stress country count')
  assert.equal(stressIndex.stats.placeCount, 500, 'stress place count')
  assert.equal(stressIndex.stats.photoCount, 500, 'stress photo count')
  assert.equal(stressIndex.renderableSubdivisionCodes.length, 500, 'stress renderable region count')
  assert.equal(stressIndex.countrySummariesByNumericId['156'], undefined, 'stress China should not be a country-only visit')
  assert.equal(
    Object.values(stressIndex.countrySummariesByCode).some(country => country.renderablePlaceCount === 0),
    false,
    'stress profile should not include countries with zero renderable places',
  )
} finally {
  if (originalTs) {
    require.extensions['.ts'] = originalTs
  } else {
    delete require.extensions['.ts']
  }
}
