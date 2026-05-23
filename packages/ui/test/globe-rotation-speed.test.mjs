import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(__dirname, '../components/globe/GlobeScene.tsx'), 'utf8')

assert.match(
  source,
  /const WORLD_ROTATE_SPEED = 1/,
  'world view should keep the default OrbitControls rotation feel',
)

assert.match(
  source,
  /const DETAIL_ROTATE_SPEED = 0\.35/,
  'close detail view should use a calmer rotation speed',
)

assert.match(
  source,
  /function RotationSpeedController/,
  'rotation speed should be adjusted from camera distance each frame',
)

assert.match(
  source,
  /rotateSpeed = THREE\.MathUtils\.lerp\(DETAIL_ROTATE_SPEED, WORLD_ROTATE_SPEED, t\)/,
  'rotation speed should ease between detail and world speeds by zoom distance',
)
