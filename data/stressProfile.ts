import countriesTopology from '../public/geo/countries-10m.json'
import subdivisionsFeatureCollection from '../public/geo/states-provinces-stress.json'
import type { CountryMemory, Photo, SubdivisionMemory, TravelerProfile } from './seed'

type CountryGeometry = {
  id?: string | number
  properties?: {
    name?: string
  }
}

type SubdivisionFeature = {
  properties?: {
    adm1_code?: string
    adm0_a3?: string
    admin?: string
    name?: string
  }
}

const COUNTRY_COUNT = 100
const REGION_COUNT = 500
const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 800

const countryGeometries = countriesTopology.objects.countries.geometries as CountryGeometry[]
const subdivisionFeatures = subdivisionsFeatureCollection.features as SubdivisionFeature[]

function picsumUrl(seed: string): string {
  return `https://picsum.photos/seed/${seed}/${IMAGE_WIDTH}/${IMAGE_HEIGHT}`
}

function stressPhoto(seed: string, caption: string): Photo {
  return {
    url: picsumUrl(seed),
    caption,
  }
}

function makeSubdivisionMemory(
  subdivisionCode: string,
  name: string,
  countryName: string,
  index: number,
): SubdivisionMemory {
  const photo = stressPhoto(
    `wenthere-stress-region-${index + 1}`,
    `Stress memory ${index + 1} in ${name}, ${countryName}`,
  )

  return {
    subdivisionCode,
    name,
    heroPic: photo.url,
    photos: [photo],
  }
}

const countryByName = new Map(
  countryGeometries
    .map(geometry => {
      const id = geometry.id == null ? '' : String(geometry.id)
      const name = geometry.properties?.name ?? ''
      return [name, { id, name }] as const
    })
    .filter(([, country]) => country.id && country.name),
)

const realRegions = subdivisionFeatures
  .map((feature, index) => {
    const properties = feature.properties
    const country = properties?.admin ? countryByName.get(properties.admin) : undefined
    if (!properties?.adm1_code || !properties.adm0_a3 || !properties.admin || !properties.name || !country) {
      return null
    }

    return {
      index,
      countryCode: properties.adm0_a3,
      countryName: properties.admin,
      countryNumericId: country.id,
      subdivisionCode: properties.adm1_code,
      name: properties.name,
    }
  })
  .filter((region): region is NonNullable<typeof region> => region != null)

const realRegionCountryCodes = new Set(realRegions.map(region => region.countryCode))
const seededCountries = new Map<string, CountryMemory>()

for (const region of realRegions) {
  if (seededCountries.has(region.countryCode)) continue
  const countryHero = stressPhoto(
    `wenthere-stress-country-${region.countryCode}`,
    `Stress country hero for ${region.countryName}`,
  )

  seededCountries.set(region.countryCode, {
    countryCode: region.countryCode,
    countryNumericId: region.countryNumericId,
    name: region.countryName,
    heroPic: countryHero.url,
    photos: [],
    subdivisions: [],
  })
}

for (const geometry of countryGeometries) {
  if (seededCountries.size >= COUNTRY_COUNT) break

  const id = geometry.id == null ? '' : String(geometry.id)
  const name = geometry.properties?.name ?? ''
  if (!id || !name || [...seededCountries.values()].some(country => country.countryNumericId === id)) continue

  const countryHero = stressPhoto(
    `wenthere-stress-country-${id}`,
    `Stress country hero for ${name}`,
  )

  seededCountries.set(id, {
    countryCode: id,
    countryNumericId: id,
    name,
    heroPic: countryHero.url,
    photos: [],
    subdivisions: [],
  })
}

const stressCountries = [...seededCountries.values()]
const countryLookup = new Map(stressCountries.map(country => [country.countryCode, country]))

for (const [regionIndex, region] of realRegions.entries()) {
  if (regionIndex >= REGION_COUNT) break

  const country = countryLookup.get(region.countryCode)
  if (!country) continue

  const memory = makeSubdivisionMemory(
    region.subdivisionCode,
    region.name,
    region.countryName,
    regionIndex,
  )

  country.subdivisions.push(memory)
  if (country.subdivisions.length === 1) country.heroPic = memory.heroPic
}


export const stressTravelerProfile: TravelerProfile = {
  name: 'Stress Test Traveler',
  countries: stressCountries,
}

export const stressProfileStats = {
  countries: stressTravelerProfile.countries.length,
  regions: stressTravelerProfile.countries.reduce((total, country) => total + country.subdivisions.length, 0),
  realRenderableRegions: realRegions.filter(region => realRegionCountryCodes.has(region.countryCode)).length,
}
