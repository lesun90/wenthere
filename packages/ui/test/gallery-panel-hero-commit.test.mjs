import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(__dirname, '../components/globe/GalleryPanel.tsx'), 'utf8')

assert.doesNotMatch(
  source,
  /if \(subdivisionHeroId && countryHeroId\)/,
  'region hero persistence must not require the current country hero to be in the open region photo list',
)

assert.match(
  source,
  /if \(subdivisionHeroId\) onPresentationCommit\?\.\(\{/,
  'region hero changes should commit independently when a region hero photo is selected',
)

assert.match(
  source,
  /if \(countryHeroId\) \{\s*onPresentationCommit\?\.\(\{/,
  'country hero changes should continue to commit independently when a country hero photo is selected',
)
