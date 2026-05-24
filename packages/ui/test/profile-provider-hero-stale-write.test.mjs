import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(__dirname, '../components/profile/ProfileProvider.tsx'), 'utf8')

assert.match(
  source,
  /const profileRef = useRef<TravelerProfile>\(seedProfile\)/,
  'ProfileProvider should keep a latest-profile ref for back-to-back persistence callbacks',
)

assert.match(
  source,
  /profileRef\.current = next[\s\S]*setProfile\(next\)/,
  'persisting a profile should update the latest-profile ref before future mutations run',
)

assert.match(
  source,
  /const saveQueueRef = useRef<Promise<void>>\(Promise\.resolve\(\)\)/,
  'profile saves should be queued so back-to-back hero persistence cannot finish out of order',
)

assert.match(
  source,
  /saveQueueRef\.current = saveJob\.catch\(\(\) => undefined\)/,
  'the save queue should advance after each queued store write settles',
)

assert.match(
  source,
  /setCountryFraming\(profileRef\.current, countryCode, photoId, framing\)/,
  'country hero persistence should compose with the latest profile state',
)

assert.match(
  source,
  /setSubdivisionFraming\(profileRef\.current, subdivisionCode, photoId, framing\)/,
  'region hero persistence should compose with the latest profile state',
)
