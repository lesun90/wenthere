const assert = require('node:assert/strict')
const path = require('node:path')
const { installTypeScriptLoader } = require('./helpers/load-ts.cjs')

const restore = installTypeScriptLoader()
const originalFetch = global.fetch

async function main() {
  const { fetchSubdivisionFeature } = require(path.resolve(__dirname, '../components/globe/usePredictivePreload.ts'))

  const fetchedUrls = []
  global.fetch = async (url, init) => {
    fetchedUrls.push({ url, init })
    return {
      async json() {
        return {
          type: 'Feature',
          properties: { adm1_code: 'PFA+00?' },
          geometry: { type: 'Point', coordinates: [0, 0] },
        }
      },
    }
  }

  const first = fetchSubdivisionFeature('PFA+00?')
  const second = fetchSubdivisionFeature('PFA+00?')
  assert.equal(first, second, 'duplicate in-flight subdivision requests should share one promise')

  const feature = await first
  assert.equal(feature.properties.adm1_code, 'PFA+00?')
  assert.deepEqual(fetchedUrls, [{
    url: '/geo/subdivisions/PFA%2B00%3F.geojson',
    init: { cache: 'force-cache' },
  }])

  const cached = await fetchSubdivisionFeature('PFA+00?')
  assert.equal(cached, feature, 'resolved subdivision geometry should be reused from cache')
  assert.equal(fetchedUrls.length, 1)

  global.fetch = async () => {
    throw new Error('missing geometry')
  }

  assert.equal(await fetchSubdivisionFeature('NOPE-404'), null)
  assert.equal(await fetchSubdivisionFeature('NOPE-404'), null)
}

main().finally(() => {
  global.fetch = originalFetch
  restore()
})
