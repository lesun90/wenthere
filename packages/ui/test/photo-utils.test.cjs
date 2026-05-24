const assert = require('node:assert/strict')
const path = require('node:path')
const { installTypeScriptLoader } = require('./helpers/load-ts.cjs')

const restore = installTypeScriptLoader()

try {
  const { firstOtherPhotoUrls } = require(path.resolve(__dirname, '../components/globe/photoUtils.ts'))

  const photos = [
    { id: '1', url: '/hero.jpg', caption: 'Hero', location: { countryCode: 'USA' } },
    { id: '2', url: '/second.jpg', caption: 'Second', location: { countryCode: 'USA' } },
    { id: '3', url: '/hero.jpg', caption: 'Duplicate hero URL', location: { countryCode: 'USA' } },
    { id: '4', url: '/third.jpg', caption: 'Third', location: { countryCode: 'USA' } },
    { id: '5', url: '/fourth.jpg', caption: 'Fourth', location: { countryCode: 'USA' } },
  ]

  assert.deepEqual(firstOtherPhotoUrls(photos, '/hero.jpg', 2), ['/second.jpg', '/third.jpg'])
  assert.deepEqual(firstOtherPhotoUrls(photos, '/hero.jpg', 0), [])
  assert.deepEqual(firstOtherPhotoUrls([], '/hero.jpg', 4), [])
} finally {
  restore()
}
