import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ProfilePresentation, TravelPhoto, TravelerProfile } from './seed'

type SubdivisionFeature = {
  properties?: {
    adm1_code?: string
    adm0_a3?: string
    name?: string | null
    name_en?: string | null
  }
}

type CountryRule = {
  code: string
  maxRegions?: number
}

type RegionReference = {
  countryCode: string
  subdivisionCode: string
  name: string
}

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 800
const SUBDIVISION_DIR = join(process.cwd(), 'data', 'geo', 'subdivisions')

const countryRules: CountryRule[] = [
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

const rulesByCountry = new Map(countryRules.map(rule => [rule.code, rule]))

function picsumUrl(seed: string): string {
  return `https://picsum.photos/seed/${seed}/${IMAGE_WIDTH}/${IMAGE_HEIGHT}`
}

function hashString(value: string): number {
  let hash = 0
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash
}

function photoCountFor(region: RegionReference): number {
  return 4 + (hashString(region.subdivisionCode) % 4)
}

function photoIdFor(region: RegionReference, index: number): string {
  const safeRegionCode = region.subdivisionCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `roamer-${safeRegionCode}-${index + 1}`
}

function readSubdivision(fileName: string): RegionReference | null {
  const feature = JSON.parse(readFileSync(join(SUBDIVISION_DIR, fileName), 'utf8')) as SubdivisionFeature
  const properties = feature.properties
  const rule = properties?.adm0_a3 ? rulesByCountry.get(properties.adm0_a3) : undefined

  if (!properties?.adm1_code || !rule) {
    return null
  }

  return {
    countryCode: rule.code,
    subdivisionCode: properties.adm1_code,
    name: properties.name_en || properties.name || properties.adm1_code,
  }
}

function readRegionsFor(rule: CountryRule): RegionReference[] {
  return readdirSync(SUBDIVISION_DIR)
    .filter(fileName => fileName.endsWith('.geojson'))
    .map(readSubdivision)
    .filter((region): region is RegionReference => region?.countryCode === rule.code)
    .sort((left, right) => (
      left.name.localeCompare(right.name)
      || left.subdivisionCode.localeCompare(right.subdivisionCode)
    ))
    .slice(0, rule.maxRegions)
}

function makeRegionPhotos(region: RegionReference): TravelPhoto[] {
  return Array.from({ length: photoCountFor(region) }, (_, index) => ({
    id: photoIdFor(region, index),
    url: picsumUrl(`roamer-${region.subdivisionCode}-${index + 1}`),
    caption: `Roamer memory ${index + 1} from ${region.name}`,
    location: {
      countryCode: region.countryCode,
      subdivisionCode: region.subdivisionCode,
    },
  }))
}

const regions = countryRules.flatMap(readRegionsFor)
const photos = regions.flatMap(makeRegionPhotos)
const presentation: ProfilePresentation = {
  countryHeroes: {},
  subdivisionHeroes: {},
}

for (const photo of photos) {
  const { countryCode, subdivisionCode } = photo.location
  if (subdivisionCode && !presentation.subdivisionHeroes?.[subdivisionCode]) {
    presentation.subdivisionHeroes![subdivisionCode] = { photoId: photo.id }
  }
  if (!presentation.countryHeroes?.[countryCode]) {
    presentation.countryHeroes![countryCode] = { photoId: photo.id }
  }
}

export const roamerProfile: TravelerProfile = {
  id: 'roamer',
  name: 'Roamer',
  photos,
  presentation,
}
