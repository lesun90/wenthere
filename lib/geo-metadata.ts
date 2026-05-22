import countryMetadata from '../data/geo/metadata/countries.json'
import subdivisionMetadata from '../data/geo/metadata/subdivisions.json'

export interface CountryMetadata {
  name: string
  numericId: string
}

export interface SubdivisionMetadata {
  countryCode: string
  name: string
}

const countries = countryMetadata as Record<string, CountryMetadata>
const subdivisions = subdivisionMetadata as Record<string, SubdivisionMetadata>

export function getCountryMetadata(countryCode: string): CountryMetadata | undefined {
  return countries[countryCode]
}

export function getSubdivisionMetadata(subdivisionCode: string): SubdivisionMetadata | undefined {
  return subdivisions[subdivisionCode]
}

export function validateSubdivisionCountry(subdivisionCode: string, countryCode: string): string | undefined {
  const subdivision = getSubdivisionMetadata(subdivisionCode)
  if (!subdivision) return `Subdivision "${subdivisionCode}" is missing from shared geo metadata.`
  if (subdivision.countryCode !== countryCode) {
    return `Subdivision "${subdivisionCode}" belongs to "${subdivision.countryCode}", not "${countryCode}".`
  }
  return undefined
}
