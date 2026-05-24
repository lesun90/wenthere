const assert = require('node:assert/strict')
const path = require('node:path')
const { installTypeScriptLoader } = require('./helpers/load-ts.cjs')

const restore = installTypeScriptLoader()

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
      USA: { photoId: 'sample-usa-ca-2', framing: { x: 0.1, y: -0.1, scale: 1.4 } },
      CHN: { photoId: 'sample-chn-gd-1' },
      VNM: { photoId: 'sample-vnm-dn-1' },
    },
    subdivisionHeroes: {
      'USA-3521': { photoId: 'sample-usa-ca-1', framing: { x: -0.2, y: 0.2, scale: 1.3 } },
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
  } = require(path.resolve(__dirname, '../lib/geodata.ts'))

  const sampleIndex = buildProfileIndex(sampleProfile)
  assert.equal(sampleProfile.locations, undefined, 'profile should not carry derived geo metadata')
  assert.equal(sampleIndex.stats.countryCount, 3)
  assert.equal(sampleIndex.stats.placeCount, 4)
  assert.equal(sampleIndex.stats.photoCount, 5)
  assert.equal(sampleIndex.countrySummariesByCode.USA.heroPic, '/sample/11.jpg')
  assert.equal(sampleIndex.countrySummariesByCode.USA.name, 'United States')
  assert.equal(sampleIndex.countrySummariesByNumericId['840'], sampleIndex.countrySummariesByCode.USA)
  assert.deepEqual(sampleIndex.countrySummariesByCode.USA.heroTransform, { x: 0.1, y: -0.1, scale: 1.4 })
  assert.equal(sampleIndex.subdivisionSummariesByCode['USA-3521'].heroPic, '/sample/10.jpg')
  assert.equal(sampleIndex.subdivisionSummariesByCode['USA-3521'].name, 'California')
  assert.deepEqual(sampleIndex.subdivisionSummariesByCode['USA-3521'].heroTransform, { x: -0.2, y: 0.2, scale: 1.3 })
  assert.deepEqual(
    sampleIndex.photosBySubdivisionCode['USA-3521'].map(photo => photo.url),
    ['/sample/10.jpg', '/sample/11.jpg'],
  )
  assert.deepEqual(
    Object.keys(sampleProfile.photos[0].location).sort(),
    ['countryCode', 'subdivisionCode'],
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
  const nonRenderableIndex = buildProfileIndex(addPhoto(sampleProfile, nonRenderablePhoto))
  assert.equal(nonRenderableIndex.subdivisionSummariesByCode['SYN-USA-CHECK'].renderable, false)
  assert.equal(nonRenderableIndex.renderableSubdivisionCodes.includes('SYN-USA-CHECK'), false)
  assert.equal(nonRenderableIndex.countrySummariesByCode.USA.photoCount, 4)
  assert.equal(
    nonRenderableIndex.countrySummariesByCode.USA.renderablePlaceCount,
    sampleIndex.countrySummariesByCode.USA.renderablePlaceCount,
  )

  const removedHero = removePhoto(sampleProfile, 'sample-usa-ca-1')
  const removedHeroIndex = buildProfileIndex(removedHero)
  assert.equal(removedHeroIndex.subdivisionSummariesByCode['USA-3521'].heroPic, '/sample/11.jpg')
  assert.equal(removedHeroIndex.subdivisionSummariesByCode['USA-3521'].heroTransform, undefined)
  assert.ok(validateProfile(removedHero).some(issue => issue.includes('sample-usa-ca-1')))

  const movedHero = updatePhoto(sampleProfile, 'sample-usa-ca-1', {
    location: {
      countryCode: 'USA',
      subdivisionCode: 'USA-3536',
    },
  })
  const movedHeroIndex = buildProfileIndex(movedHero)
  assert.equal(movedHeroIndex.subdivisionSummariesByCode['USA-3521'].heroPic, '/sample/11.jpg')
  assert.equal(movedHeroIndex.subdivisionSummariesByCode['USA-3521'].heroTransform, undefined)
  assert.ok(
    validateProfile(movedHero).some(issue => issue.includes('USA-3521') && issue.includes('sample-usa-ca-1')),
  )

  const countryOnlyIndex = buildProfileIndex({
    id: 'country-only-check',
    name: 'Country Only Check',
    photos: [{
      id: 'country-only-photo',
      url: '/sample/country-only.jpg',
      caption: 'Country-only photo should not create a visited country',
      location: { countryCode: 'CHN' },
    }],
  })
  assert.equal(countryOnlyIndex.stats.countryCount, 0)
  assert.equal(countryOnlyIndex.countrySummariesByNumericId['156'], undefined)

  const unknownIndex = buildProfileIndex({
    id: 'unknown-check',
    name: 'Unknown Check',
    photos: [{
      id: 'unknown-photo',
      url: '/sample/unknown.jpg',
      caption: 'Unknown place',
      location: { countryCode: 'XXX', subdivisionCode: 'XXX-1' },
    }],
  })
  assert.equal(unknownIndex.countrySummariesByCode.XXX.name, 'XXX')
  assert.equal(unknownIndex.countrySummariesByCode.XXX.countryNumericId, 'XXX')
  assert.equal(unknownIndex.subdivisionSummariesByCode['XXX-1'].name, 'XXX-1')

  const invalidProfile = {
    id: 'invalid',
    name: 'Invalid',
    photos: [
      { id: '', url: '/missing-id.jpg', caption: 'Missing id', location: { countryCode: 'USA' } },
      { id: 'dupe', url: '/dupe-a.jpg', caption: 'Dupe A', location: { countryCode: '' } },
      { id: 'dupe', url: '/dupe-b.jpg', caption: 'Dupe B', location: { countryCode: 'CHN', subdivisionCode: 'USA-3521' } },
      { id: 'outside-sub', url: '/outside-sub.jpg', caption: 'Outside subdivision', location: { countryCode: 'USA', subdivisionCode: 'USA-3536' } },
    ],
    presentation: {
      countryHeroes: {
        USA: { photoId: 'dupe' },
        CHN: { photoId: 'missing-photo' },
      },
      subdivisionHeroes: {
        'USA-3521': { photoId: 'outside-sub' },
        'USA-3536': { photoId: 'missing-photo' },
      },
    },
  }
  const issues = validateProfile(invalidProfile)
  assert.ok(issues.some(issue => issue.includes('missing an id')))
  assert.ok(issues.some(issue => issue.includes('Duplicate photo id "dupe"')))
  assert.ok(issues.some(issue => issue.includes('missing location.countryCode')))
  assert.ok(issues.some(issue => issue.includes('USA-3521') && issue.includes('CHN') && issue.includes('USA')))
  assert.ok(issues.some(issue => issue.includes('Country "USA"') && issue.includes('outside the country')))
  assert.ok(issues.some(issue => issue.includes('Country "CHN"') && issue.includes('missing hero photo')))
  assert.ok(issues.some(issue => issue.includes('Subdivision "USA-3521"') && issue.includes('outside the subdivision')))
  assert.ok(issues.some(issue => issue.includes('Subdivision "USA-3536"') && issue.includes('missing hero photo')))
} finally {
  restore()
}
