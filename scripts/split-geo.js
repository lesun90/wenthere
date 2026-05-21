#!/usr/bin/env node
// Usage: node scripts/split-geo.js <path-to-ne_admin_1_states_provinces.geojson>
// Splits a Natural Earth admin-1 GeoJSON into one file per subdivision under
// public/geo/subdivisions/<adm1_code>.geojson

const fs = require('fs')
const path = require('path')

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/split-geo.js <path-to-geojson>')
  process.exit(1)
}

const outDir = path.join(__dirname, '..', 'public', 'geo', 'subdivisions')
fs.mkdirSync(outDir, { recursive: true })

console.log(`Reading ${inputPath}...`)
const raw = fs.readFileSync(inputPath, 'utf8')
const data = JSON.parse(raw)

if (!data.features) {
  console.error('Input does not look like a GeoJSON FeatureCollection')
  process.exit(1)
}

console.log(`Total features: ${data.features.length}`)

let written = 0
let skipped = 0

for (const feature of data.features) {
  const code = feature.properties?.adm1_code
  if (!code) {
    skipped++
    continue
  }

  const stripped = {
    type: 'Feature',
    geometry: feature.geometry,
    properties: {
      adm1_code: code,
      name: feature.properties.name ?? null,
      name_alt: feature.properties.name_alt ?? null,
      name_en: feature.properties.name_en ?? null,
      adm0_a3: feature.properties.adm0_a3 ?? null,
    },
  }

  fs.writeFileSync(path.join(outDir, `${code}.geojson`), JSON.stringify(stripped))
  written++
}

console.log(`Done. Written to ${outDir}`)
console.log(`  ${written} subdivision files (${skipped} skipped - no adm1_code)`)
