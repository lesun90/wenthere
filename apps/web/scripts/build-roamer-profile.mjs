#!/usr/bin/env node
// Generates data/roamerProfile.json from the subdivision GeoJSON files.
// Run: pnpm --filter @beenthere/web build:roamer-profile
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SUBDIVISION_DIR = join(__dirname, '../../../packages/ui/data/geo/subdivisions')
const OUT_FILE = join(__dirname, '../data/roamerProfile.json')

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 800

const countryRules = [
  { code: 'USA' },
  { code: 'VNM' },
  { code: 'CHN' },
  { code: 'ZAF' },
  { code: 'EGY' },
  { code: 'MAR' },
  { code: 'KEN' },
  { code: 'NGA' },
  { code: 'ETH' },
  { code: 'FRA', maxRegions: 12 },
  { code: 'DEU', maxRegions: 12 },
  { code: 'ITA', maxRegions: 12 },
  { code: 'ESP', maxRegions: 12 },
  { code: 'GBR', maxRegions: 12 },
  { code: 'NLD', maxRegions: 12 },
]

const rulesByCountry = new Map(countryRules.map(r => [r.code, r]))

function picsumUrl(seed) {
  return `https://picsum.photos/seed/${seed}/${IMAGE_WIDTH}/${IMAGE_HEIGHT}`
}

function hashString(value) {
  let hash = 0
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

function photoCountFor(region) {
  return 4 + (hashString(region.subdivisionCode) % 4)
}

function photoIdFor(region, index) {
  const safe = region.subdivisionCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `roamer-${safe}-${index + 1}`
}

function readSubdivision(fileName) {
  const feature = JSON.parse(readFileSync(join(SUBDIVISION_DIR, fileName), 'utf8'))
  const props = feature.properties
  const rule = props?.adm0_a3 ? rulesByCountry.get(props.adm0_a3) : undefined
  if (!props?.adm1_code || !rule) return null
  return {
    countryCode: rule.code,
    subdivisionCode: props.adm1_code,
    name: props.name_en || props.name || props.adm1_code,
  }
}

function readRegionsFor(rule) {
  return readdirSync(SUBDIVISION_DIR)
    .filter(f => f.endsWith('.geojson'))
    .map(readSubdivision)
    .filter(r => r?.countryCode === rule.code)
    .sort((a, b) => a.name.localeCompare(b.name) || a.subdivisionCode.localeCompare(b.subdivisionCode))
    .slice(0, rule.maxRegions)
}

const regions = countryRules.flatMap(readRegionsFor)
const photos = regions.flatMap(region =>
  Array.from({ length: photoCountFor(region) }, (_, i) => ({
    id: photoIdFor(region, i),
    url: picsumUrl(`roamer-${region.subdivisionCode}-${i + 1}`),
    caption: `Roamer memory ${i + 1} from ${region.name}`,
    location: { countryCode: region.countryCode, subdivisionCode: region.subdivisionCode },
  }))
)

const countryHeroes = {}
const subdivisionHeroes = {}
for (const photo of photos) {
  const { countryCode, subdivisionCode } = photo.location
  if (subdivisionCode && !subdivisionHeroes[subdivisionCode]) {
    subdivisionHeroes[subdivisionCode] = { photoId: photo.id }
  }
  if (!countryHeroes[countryCode]) {
    countryHeroes[countryCode] = { photoId: photo.id }
  }
}

const profile = {
  id: 'roamer',
  name: 'Roamer',
  photos,
  presentation: { countryHeroes, subdivisionHeroes },
}

writeFileSync(OUT_FILE, JSON.stringify(profile, null, 2) + '\n', 'utf8')
console.log(`Wrote ${photos.length} photos across ${regions.length} regions to ${OUT_FILE}`)
