import subdivisionsFeatureCollection from '../public/geo/states-provinces-stress.json'
import type { ProfilePresentation, TravelPhoto, TravelerProfile } from './seed'

type SubdivisionFeature = {
  properties?: {
    adm1_code?: string
    adm0_a3?: string
    name?: string
    name_en?: string
  }
}

type RegionReference = {
  countryCode: string
  countryName: string
  countryNumericId: string
  subdivisionCode: string
  name: string
}

const REGION_COUNT = 500
const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 800

const subdivisionFeatures = subdivisionsFeatureCollection.features as SubdivisionFeature[]

const countryByAlpha3: Record<string, { numericId: string; name: string }> = {
  ABW: { numericId: '533', name: 'Aruba' },
  AFG: { numericId: '004', name: 'Afghanistan' },
  AGO: { numericId: '024', name: 'Angola' },
  AIA: { numericId: '660', name: 'Anguilla' },
  ALB: { numericId: '008', name: 'Albania' },
  ALD: { numericId: '248', name: 'Aland' },
  AND: { numericId: '020', name: 'Andorra' },
  ARE: { numericId: '784', name: 'United Arab Emirates' },
  ARG: { numericId: '032', name: 'Argentina' },
  ARM: { numericId: '051', name: 'Armenia' },
  ASM: { numericId: '016', name: 'American Samoa' },
  ATA: { numericId: '010', name: 'Antarctica' },
  ATC: { numericId: '036', name: 'Ashmore and Cartier Is.' },
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

function makeRegionPhoto(region: RegionReference, index: number): TravelPhoto {
  const displayIndex = index + 1
  return {
    id: `stress-region-${displayIndex}`,
    url: picsumUrl(`wenthere-stress-region-${displayIndex}`),
    caption: `Stress memory ${displayIndex} in ${region.name}, ${region.countryName}`,
    location: {
      countryCode: region.countryCode,
      countryName: region.countryName,
      countryNumericId: region.countryNumericId,
      subdivisionCode: region.subdivisionCode,
      subdivisionName: region.name,
    },
  }
}

const realRegions = subdivisionFeatures
  .map(feature => {
    const properties = feature.properties
    const country = properties?.adm0_a3 ? countryByAlpha3[properties.adm0_a3] : undefined
    if (!properties?.adm1_code || !properties.adm0_a3 || !country) {
      return null
    }

    return {
      countryCode: properties.adm0_a3,
      countryName: country.name,
      countryNumericId: country.numericId,
      subdivisionCode: properties.adm1_code,
      name: properties.name_en || properties.name || properties.adm1_code,
    }
  })
  .filter((region): region is RegionReference => region != null)
  .slice(0, REGION_COUNT)

const photos: TravelPhoto[] = realRegions.map(makeRegionPhoto)
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

export const stressTravelerProfile: TravelerProfile = {
  id: 'stress-test-traveler',
  name: 'Stress Test Traveler',
  photos,
  presentation,
}
