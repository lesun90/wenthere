import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(__dirname, '../components/globe/SubdivisionLayer.tsx'), 'utf8')

assert.match(
  source,
  /const subdivisionInteractionsEnabled = opacity > 0/,
  'region taps should stay enabled while the subdivision layer is visible',
)

assert.match(
  source,
  /interactive=\{subdivisionInteractionsEnabled\}/,
  'region tap handling should not be gated by hover suppression',
)

assert.match(
  source,
  /hoverEnabled=\{interactionsEnabled\}/,
  'region hover should still be disabled while controls are active',
)
