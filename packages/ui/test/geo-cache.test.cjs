const assert = require('node:assert/strict')
const path = require('node:path')
const { installTypeScriptLoader } = require('./helpers/load-ts.cjs')

const restore = installTypeScriptLoader()

try {
  const featureCache = require(path.resolve(__dirname, '../lib/subdivision-feature-cache.ts'))
  const registry = require(path.resolve(__dirname, '../lib/geo-registry.ts'))

  const feature = {
    type: 'Feature',
    properties: { adm1_code: 'TEST-1' },
    geometry: { type: 'Point', coordinates: [1, 2] },
  }

  assert.equal(featureCache.getCachedFeature('TEST-1'), undefined)
  assert.equal(featureCache.hasCachedEntry('TEST-1'), false)

  featureCache.setCachedFeature('TEST-1', feature)
  assert.equal(featureCache.getCachedFeature('TEST-1'), feature)
  assert.equal(featureCache.hasCachedEntry('TEST-1'), true)

  featureCache.setCachedFeature('TEST-404', null)
  assert.equal(featureCache.getCachedFeature('TEST-404'), null)
  assert.equal(featureCache.hasCachedEntry('TEST-404'), true)

  const polygon = {
    type: 'Polygon',
    coordinates: [[
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]],
  }

  assert.equal(registry.getCountryGeometry('ZZZ'), null)
  assert.equal(registry.getSubdivisionGeometry('ZZZ-1'), null)

  registry.registerCountryGeometry('ZZZ', polygon)
  registry.registerSubdivisionGeometry('ZZZ-1', null)

  assert.equal(registry.getCountryGeometry('ZZZ'), polygon)
  assert.equal(registry.getSubdivisionGeometry('ZZZ-1'), null)
} finally {
  restore()
}
