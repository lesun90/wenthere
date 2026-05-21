import type { CountryMemory, SubdivisionMemory, TravelerProfile } from '../data/seed'

const alpha3ToNumeric: Record<string, string> = {
  USA: '840',
  CHN: '156',
  VNM: '704',
}

export function getVisitedCountries(
  profile: TravelerProfile,
  heroOverrides: Record<string, string> = {},
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const country of profile.countries) {
    const numericId = country.countryNumericId ?? alpha3ToNumeric[country.countryCode] ?? country.countryCode
    result[numericId] = heroOverrides[country.countryCode] ?? country.heroPic
  }
  return result
}

export function getVisitedSubdivisions(
  profile: TravelerProfile,
  heroOverrides: Record<string, string> = {},
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const country of profile.countries) {
    for (const sub of country.subdivisions) {
      result[sub.subdivisionCode] = heroOverrides[sub.subdivisionCode] ?? sub.heroPic
    }
  }
  return result
}

export function getCountryMemoryByNumericId(profile: TravelerProfile): Record<string, CountryMemory> {
  const result: Record<string, CountryMemory> = {}
  for (const country of profile.countries) {
    const numericId = country.countryNumericId ?? alpha3ToNumeric[country.countryCode] ?? country.countryCode
    result[numericId] = country
  }
  return result
}

export function getSubdivisionMemoryByCode(profile: TravelerProfile): Record<string, SubdivisionMemory> {
  const result: Record<string, SubdivisionMemory> = {}
  for (const country of profile.countries) {
    for (const sub of country.subdivisions) {
      result[sub.subdivisionCode] = sub
    }
  }
  return result
}

export function getCountryHeroByCode(profile: TravelerProfile): Record<string, string> {
  const result: Record<string, string> = {}
  for (const country of profile.countries) {
    result[country.countryCode] = country.heroPic
  }
  return result
}
