import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(__dirname, '../components/globe/CountryLayer.tsx'), 'utf8')

assert.match(
  source,
  /const countryInteractionsEnabled = !showSubdivisions/,
  'country taps should remain enabled in world mode even when hover interactions are suppressed',
)

assert.match(
  source,
  /const countryHoverEnabled = interactionsEnabled && !showSubdivisions/,
  'country hover should still be disabled while controls are active',
)
