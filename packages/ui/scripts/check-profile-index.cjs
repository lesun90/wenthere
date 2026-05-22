const assert = require('node:assert/strict')
const fs = require('node:fs')
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
  const webDataDir = path.resolve(repoRoot, '../../apps/web/data')
  const travelerProfile = require(path.join(webDataDir, 'demoProfile.json'))
  const roamerProfile = require(path.join(webDataDir, 'roamerProfile.json'))
  const {
    addPhoto,
    buildProfileIndex,
    removePhoto,
    updatePhoto,
    validateProfile,
  } = require(path.join(repoRoot, 'lib/geodata.ts'))

  const demoIndex = buildProfileIndex(travelerProfile)
  assert.equal(travelerProfile.locations, undefined, 'demo profile should not carry geo metadata')
  assert.equal(demoIndex.stats.countryCount, 3, 'demo country count')
  assert.equal(demoIndex.stats.placeCount, 13, 'demo place count')
  assert.equal(demoIndex.stats.photoCount, 26, 'demo photo count')
  assert.equal(demoIndex.countrySummariesByCode.USA.heroPic, '/demo/10.jpg', 'demo USA hero')
  assert.equal(demoIndex.countrySummariesByCode.USA.name, 'United States', 'demo USA name')
  assert.equal(demoIndex.subdivisionSummariesByCode['USA-3521'].heroPic, '/demo/10.jpg', 'demo California hero')
  assert.equal(demoIndex.subdivisionSummariesByCode['USA-3521'].name, 'California', 'demo California name')
  assert.deepEqual(
    demoIndex.photosBySubdivisionCode['USA-3521'].map(photo => photo.url),
    ['/demo/10.jpg', '/demo/11.jpg'],
    'demo subdivision gallery order',
  )
  assert.deepEqual(
    Object.keys(travelerProfile.photos[0].location).sort(),
    ['countryCode', 'subdivisionCode'],
    'photo locations should expose stable codes only',
  )

  const nonRenderablePhoto = {
    id: 'check-non-renderable',
    url: '/demo/non-renderable.jpg',
    caption: 'Non-renderable test memory',
    location: {
      countryCode: 'USA',
      subdivisionCode: 'SYN-USA-CHECK',
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
      subdivisionCode: 'USA-3536',
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
      },
    }],
  })
  assert.equal(countryOnlyIndex.stats.countryCount, 0, 'country-only photos should not create visited countries')
  assert.equal(countryOnlyIndex.countrySummariesByNumericId['156'], undefined)

  const roamerIndex = buildProfileIndex(roamerProfile)
  assert.equal(roamerProfile.name, 'Roamer', 'roamer name')
  assert.equal(roamerProfile.locations, undefined, 'roamer profile should not carry geo metadata')
  assert.ok(roamerIndex.stats.placeCount > 200, 'roamer should visit more than 200 regions')
  assert.ok(roamerIndex.stats.photoCount > roamerIndex.stats.placeCount * 3, 'roamer should have more than 3 photos per region')
  assert.equal(roamerIndex.renderableSubdivisionCodes.length, roamerIndex.stats.placeCount, 'roamer renderable region count')
  assert.equal(roamerIndex.countrySummariesByNumericId['156']?.countryCode, 'CHN', 'roamer should include China')

  const assertCountryRegions = (countryCode, expectedCount, label) => {
    const summary = roamerIndex.countrySummariesByCode[countryCode]
    assert.ok(summary, `${label} should be visited`)
    assert.equal(summary.subdivisionCodes.length, expectedCount, `${label} region count`)
    for (const subdivisionCode of summary.subdivisionCodes) {
      const photos = roamerIndex.photosBySubdivisionCode[subdivisionCode] ?? []
      assert.ok(photos.length > 3, `${label} ${subdivisionCode} should have more than 3 photos`)
    }
  }

  assertCountryRegions('USA', 51, 'United States')
  assertCountryRegions('VNM', 63, 'Vietnam')
  assert.ok(
    ['ZAF', 'EGY', 'MAR', 'KEN', 'NGA', 'ETH'].some(countryCode => roamerIndex.countrySummariesByCode[countryCode]),
    'roamer should include African regions',
  )
  assert.ok(
    ['FRA', 'DEU', 'ITA', 'ESP', 'GBR', 'NLD'].some(countryCode => roamerIndex.countrySummariesByCode[countryCode]),
    'roamer should include European regions',
  )
  assert.equal(
    Object.values(roamerIndex.countrySummariesByCode).some(country => country.renderablePlaceCount === 0),
    false,
    'roamer profile should not include countries with zero renderable places',
  )

  const mismatchedSubdivision = updatePhoto(travelerProfile, 'demo-usa-ca-1', {
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
