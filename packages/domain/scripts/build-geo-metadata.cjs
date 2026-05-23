const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '../../..')
const sourceGeoDir = path.join(repoRoot, 'packages/ui/data/geo')
const statesPath = path.join(sourceGeoDir, 'states-provinces-50m.json')
const subdivisionDir = path.join(sourceGeoDir, 'subdivisions')
const metadataDir = path.join(repoRoot, 'packages/domain/data/geo/metadata')

const countryNumericIds = {
  CHN: '156',
  DEU: '276',
  EGY: '818',
  ESP: '724',
  ETH: '231',
  FRA: '250',
  GBR: '826',
  ITA: '380',
  KEN: '404',
  MAR: '504',
  NGA: '566',
  NLD: '528',
  USA: '840',
  VNM: '704',
  ZAF: '710',
}

const countryDisplayNames = {
  CHN: 'China',
  DEU: 'Germany',
  EGY: 'Egypt',
  ESP: 'Spain',
  ETH: 'Ethiopia',
  FRA: 'France',
  GBR: 'United Kingdom',
  ITA: 'Italy',
  KEN: 'Kenya',
  MAR: 'Morocco',
  NGA: 'Nigeria',
  NLD: 'Netherlands',
  USA: 'United States',
  VNM: 'Vietnam',
  ZAF: 'South Africa',
}

function readSubdivisionMetadata(fileName) {
  const feature = JSON.parse(fs.readFileSync(path.join(subdivisionDir, fileName), 'utf8'))
  const properties = feature.properties ?? {}
  const code = properties.adm1_code
  if (!code) return null

  return [
    code,
    {
      countryCode: properties.adm0_a3 ?? '',
      name: properties.name_en || properties.name || code,
    },
  ]
}

fs.mkdirSync(metadataDir, { recursive: true })

const states = JSON.parse(fs.readFileSync(statesPath, 'utf8'))
const countryNames = new Map(Object.entries(countryDisplayNames))
for (const feature of states.features ?? []) {
  const properties = feature.properties ?? {}
  if (properties.adm0_a3 && properties.admin && !countryNames.has(properties.adm0_a3)) {
    countryNames.set(properties.adm0_a3, properties.admin)
  }
}

const countries = Object.fromEntries(
  Array.from(countryNames.entries())
    .sort(([leftCode], [rightCode]) => leftCode.localeCompare(rightCode))
    .map(([countryCode, name]) => [
      countryCode,
      {
        name,
        numericId: countryNumericIds[countryCode] ?? countryCode,
      },
    ]),
)

const subdivisions = Object.fromEntries(
  fs.readdirSync(subdivisionDir)
    .filter(fileName => fileName.endsWith('.geojson'))
    .map(readSubdivisionMetadata)
    .filter(Boolean)
    .sort(([leftCode], [rightCode]) => leftCode.localeCompare(rightCode)),
)

fs.writeFileSync(
  path.join(metadataDir, 'countries.json'),
  `${JSON.stringify(countries, null, 2)}\n`,
)
fs.writeFileSync(
  path.join(metadataDir, 'subdivisions.json'),
  `${JSON.stringify(subdivisions, null, 2)}\n`,
)

console.log(`Wrote ${Object.keys(countries).length} countries and ${Object.keys(subdivisions).length} subdivisions.`)
