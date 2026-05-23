const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const appRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(appRoot, '../..')
const originalTs = require.extensions['.ts']

function loadTypeScript(module, filename) {
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

require.extensions['.ts'] = loadTypeScript

try {
  const demoProfile = require(path.join(appRoot, 'data/demoProfile.json'))
  const roamerProfile = require(path.join(appRoot, 'data/roamerProfile.json'))
  const { buildProfileIndex, validateProfile } = require(path.join(repoRoot, 'packages/ui/lib/geodata.ts'))

  assert.equal(typeof buildProfileIndex, 'function', 'ui package should own buildProfileIndex')
  assert.equal(typeof validateProfile, 'function', 'ui package should own validateProfile')

  const demoIndex = buildProfileIndex(demoProfile)
  assert.equal(demoProfile.locations, undefined, 'demo profile should not carry geo metadata')
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
} finally {
  if (originalTs) {
    require.extensions['.ts'] = originalTs
  } else {
    delete require.extensions['.ts']
  }
}
