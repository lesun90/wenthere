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
    name?: string
    name_en?: string
  }
}

type CountryReference = {
  numericId: string
  name: string
}

const COUNTRY_COUNT = 100
const REGION_COUNT = 500
const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 800

const countryGeometries = countriesTopology.objects.countries.geometries as CountryGeometry[]
const subdivisionFeatures = subdivisionsFeatureCollection.features as SubdivisionFeature[]

const countryByAlpha3: Record<string, CountryReference> = {
  ABW: { numericId: '533', name: 'Aruba' },
  AFG: { numericId: '004', name: 'Afghanistan' },
  AGO: { numericId: '024', name: 'Angola' },
  AIA: { numericId: '660', name: 'Anguilla' },
  ALB: { numericId: '008', name: 'Albania' },
  AND: { numericId: '020', name: 'Andorra' },
  ARE: { numericId: '784', name: 'United Arab Emirates' },
  ARG: { numericId: '032', name: 'Argentina' },
  ARM: { numericId: '051', name: 'Armenia' },
  ASM: { numericId: '016', name: 'American Samoa' },
  ATA: { numericId: '010', name: 'Antarctica' },
  ATF: { numericId: '260', name: 'Fr. S. Antarctic Lands' },
  ATG: { numericId: '028', name: 'Antigua and Barb.' },
  AUS: { numericId: '036', name: 'Australia' },
  AUT: { numericId: '040', name: 'Austria' },
  AZE: { numericId: '031', name: 'Azerbaijan' },
  BDI: { numericId: '108', name: 'Burundi' },
  BEL: { numericId: '056', name: 'Belgium' },
  BEN: { numericId: '204', name: 'Benin' },
  BFA: { numericId: '854', name: 'Burkina Faso' },
  BGD: { numericId: '050', name: 'Bangladesh' },
  BGR: { numericId: '100', name: 'Bulgaria' },
  BHR: { numericId: '048', name: 'Bahrain' },
  BHS: { numericId: '044', name: 'Bahamas' },
  BIH: { numericId: '070', name: 'Bosnia and Herz.' },
  BLM: { numericId: '652', name: 'St-Barthelemy' },
  BLR: { numericId: '112', name: 'Belarus' },
  BLZ: { numericId: '084', name: 'Belize' },
  BMU: { numericId: '060', name: 'Bermuda' },
  BOL: { numericId: '068', name: 'Bolivia' },
  BRA: { numericId: '076', name: 'Brazil' },
  BRB: { numericId: '052', name: 'Barbados' },
}

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

function makeSyntheticSubdivisionMemory(country: CountryMemory, index: number): SubdivisionMemory {
  const displayIndex = index + 1
  return {
    ...makeSubdivisionMemory(
      `SYN-${country.countryCode}-${displayIndex}`,
      `${country.name} stress place ${displayIndex}`,
      country.name,
      index,
    ),
    renderable: false,
  }
}

const realRegions = subdivisionFeatures
  .map((feature, index) => {
    const properties = feature.properties
    const country = properties?.adm0_a3 ? countryByAlpha3[properties.adm0_a3] : undefined
    if (!properties?.adm1_code || !properties.adm0_a3 || !properties.name || !country) {
      return null
    }

    return {
      index,
      countryCode: properties.adm0_a3,
      countryName: country.name,
      countryNumericId: country.numericId,
      subdivisionCode: properties.adm1_code,
      name: properties.name_en ?? properties.name,
    }
  })
  .filter((region): region is NonNullable<typeof region> => region != null)

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
const regionsByCountry = new Map<string, typeof realRegions>()

for (const region of realRegions) {
  const regions = regionsByCountry.get(region.countryCode) ?? []
  regions.push(region)
  regionsByCountry.set(region.countryCode, regions)
}

let memoryIndex = 0
const usedRealRegionCodes = new Set<string>()

for (const country of stressCountries) {
  if (memoryIndex >= REGION_COUNT) break

  const region = regionsByCountry.get(country.countryCode)?.find(item => !usedRealRegionCodes.has(item.subdivisionCode))
  const memory = region
    ? makeSubdivisionMemory(region.subdivisionCode, region.name, region.countryName, memoryIndex)
    : makeSyntheticSubdivisionMemory(country, memoryIndex)

  if (region) usedRealRegionCodes.add(region.subdivisionCode)
  country.subdivisions.push(memory)
  country.heroPic = memory.heroPic
  memoryIndex += 1
}

for (const region of realRegions) {
  if (memoryIndex >= REGION_COUNT) break
  if (usedRealRegionCodes.has(region.subdivisionCode)) continue

  const country = countryLookup.get(region.countryCode)
  if (!country) continue

  const memory = makeSubdivisionMemory(
    region.subdivisionCode,
    region.name,
    region.countryName,
    memoryIndex,
  )

  country.subdivisions.push(memory)
  usedRealRegionCodes.add(region.subdivisionCode)
  memoryIndex += 1
}

let syntheticCountryIndex = 0
while (memoryIndex < REGION_COUNT) {
  const country = stressCountries[syntheticCountryIndex % stressCountries.length]
  country.subdivisions.push(makeSyntheticSubdivisionMemory(country, memoryIndex))
  syntheticCountryIndex += 1
  memoryIndex += 1
}

export const stressTravelerProfile: TravelerProfile = {
  name: 'Stress Test Traveler',
  countries: stressCountries,
}

export const stressProfileStats = {
  countries: stressTravelerProfile.countries.length,
  regions: stressTravelerProfile.countries.reduce((total, country) => total + country.subdivisions.length, 0),
  realRenderableRegions: usedRealRegionCodes.size,
}
