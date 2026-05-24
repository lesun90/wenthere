const assert = require('node:assert/strict')
const path = require('node:path')
const { installTypeScriptLoader } = require('./helpers/load-ts.cjs')

const restore = installTypeScriptLoader()

try {
  const {
    featureCentroid,
    geoJsonToSvgPath,
    geometryFrameBounds,
  } = require(path.resolve(__dirname, '../lib/geomath.ts'))

  assert.deepEqual(featureCentroid({ type: 'Feature', properties: {}, geometry: null }), [0, 0])
  assert.deepEqual(
    featureCentroid({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [12, -3] },
    }),
    [12, -3],
  )
  assert.deepEqual(
    featureCentroid({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
      },
    }),
    [5, 5],
  )
  assert.deepEqual(
    featureCentroid({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[[100, 100], [102, 100]]],
          [[[0, 0], [10, 0], [10, 10], [0, 10]]],
        ],
      },
    }),
    [5, 5],
  )

  const square = {
    type: 'Polygon',
    coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
  }
  assert.deepEqual(geometryFrameBounds(square, 100, 80, 10), {
    x: 20,
    y: 10,
    width: 60,
    height: 60,
  })
  assert.equal(geometryFrameBounds(null, 100, 80), null)
  assert.equal(
    geometryFrameBounds({ type: 'Polygon', coordinates: [[[0, 0], [0, 1], [0, 0]]] }, 100, 80),
    null,
  )

  assert.equal(
    geoJsonToSvgPath(square, 100, 80, 10),
    'M 20.0 70.0 L 80.0 70.0 L 80.0 10.0 L 20.0 10.0 L 20.0 70.0 Z',
  )
  assert.equal(geoJsonToSvgPath({ type: 'Point', coordinates: [0, 0] }, 100, 80), '')
  assert.equal(
    geoJsonToSvgPath({
      type: 'Polygon',
      coordinates: [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]],
      ],
    }, 100, 80, 10),
    'M 20.0 70.0 L 80.0 70.0 L 80.0 10.0 L 20.0 10.0 L 20.0 70.0 Z',
  )
} finally {
  restore()
}
