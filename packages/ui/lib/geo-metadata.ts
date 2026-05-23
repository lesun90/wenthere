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

export function findCountryCodeByName(name: string): string | undefined {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return undefined
  return Object.entries(countries).find(([, country]) =>
    country.name.toLowerCase() === normalized,
  )?.[0]
}

export function listCountries(): Array<{ code: string; name: string; numericId: string }> {
  return Object.entries(countries).map(([code, country]) => ({ code, ...country }))
}

export function getSubdivisionMetadata(subdivisionCode: string): SubdivisionMetadata | undefined {
  return subdivisions[subdivisionCode]
}

export function findSubdivisionCodeByName(name: string, countryCode?: string): string | undefined {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return undefined
  return Object.entries(subdivisions).find(([, subdivision]) => {
    if (subdivision.name.toLowerCase() !== normalized) return false
    return countryCode ? subdivision.countryCode === countryCode : true
  })?.[0]
}

export function listSubdivisions(countryCode?: string): Array<{ code: string; countryCode: string; name: string }> {
  return Object.entries(subdivisions)
    .filter(([, subdivision]) => !countryCode || subdivision.countryCode === countryCode)
    .map(([code, subdivision]) => ({ code, ...subdivision }))
}

export function validateSubdivisionCountry(subdivisionCode: string, countryCode: string): string | undefined {
  const subdivision = getSubdivisionMetadata(subdivisionCode)
  if (!subdivision) return `Subdivision "${subdivisionCode}" is missing from shared geo metadata.`
  if (subdivision.countryCode !== countryCode) {
    return `Subdivision "${subdivisionCode}" belongs to "${subdivision.countryCode}", not "${countryCode}".`
  }
  return undefined
}
