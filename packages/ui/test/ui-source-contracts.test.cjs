const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')

function source(relativePath) {
  return readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8')
}

const countryLayer = source('components/globe/CountryLayer.tsx')
assert.match(countryLayer, /const countryInteractionsEnabled = !showSubdivisions/)
assert.match(countryLayer, /const countryHoverEnabled = interactionsEnabled && !showSubdivisions/)

const subdivisionLayer = source('components/globe/SubdivisionLayer.tsx')
assert.match(subdivisionLayer, /const subdivisionInteractionsEnabled = opacity > 0/)
assert.match(subdivisionLayer, /interactive=\{subdivisionInteractionsEnabled\}/)
assert.match(subdivisionLayer, /hoverEnabled=\{interactionsEnabled\}/)
assert.match(subdivisionLayer, /const heroTransform = heroTransforms\[id\] \?\? summary\?\.heroTransform/)

const galleryPanel = source('components/globe/GalleryPanel.tsx')
assert.doesNotMatch(galleryPanel, /if \(subdivisionHeroId && countryHeroId\)/)
assert.match(galleryPanel, /if \(subdivisionHeroId\) onPresentationCommit\?\.\(\{/)
assert.match(galleryPanel, /if \(countryHeroId\) \{\s*onPresentationCommit\?\.\(\{/)

const globeScene = source('components/globe/GlobeScene.tsx')
assert.match(globeScene, /const WORLD_ROTATE_SPEED = 1/)
assert.match(globeScene, /const DETAIL_ROTATE_SPEED = 0\.35/)
assert.match(globeScene, /function RotationSpeedController/)
assert.match(globeScene, /rotateSpeed = THREE\.MathUtils\.lerp\(DETAIL_ROTATE_SPEED, WORLD_ROTATE_SPEED, t\)/)

const profileProvider = source('components/profile/ProfileProvider.tsx')
assert.match(profileProvider, /const profileRef = useRef<TravelerProfile>\(seedProfile\)/)
assert.match(profileProvider, /profileRef\.current = next[\s\S]*setProfile\(next\)/)
assert.match(profileProvider, /const saveQueueRef = useRef<Promise<void>>\(Promise\.resolve\(\)\)/)
assert.match(profileProvider, /saveQueueRef\.current = saveJob\.catch\(\(\) => undefined\)/)
assert.match(profileProvider, /setCountryFraming\(profileRef\.current, countryCode, photoId, framing\)/)
assert.match(profileProvider, /setSubdivisionFraming\(profileRef\.current, subdivisionCode, photoId, framing\)/)

const photoDrawer = source('components/globe/PhotoManagementDrawer.tsx')
assert.match(photoDrawer, /type="search" role="combobox"/)
assert.match(photoDrawer, /role="listbox" aria-label="Search suggestions"/)
assert.match(photoDrawer, /accept="image\/\*"/)
assert.match(photoDrawer, /contentVisibility: 'auto'/)

const floatingCard = source('components/globe/FloatingCard.tsx')
assert.match(floatingCard, /requestAnimationFrame/)
assert.match(floatingCard, /Math\.min\(Math\.max/)
