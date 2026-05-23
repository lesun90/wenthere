import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const preloadSource = readFileSync(resolve(__dirname, '../components/globe/usePredictivePreload.ts'), 'utf8')

assert.match(
  preloadSource,
  /encodeURIComponent\(subdivisionCode\)/,
  'subdivision geometry fetches should encode the subdivision code as one URL path segment',
)
