import type { TravelerProfile } from '../data/seed'

// Maps ISO 3166-1 alpha-3 → numeric string (as used in countries-50m.json TopoJSON feature ids)
const alpha3ToNumeric: Record<string, string> = {
  USA: '840',
  CHN: '156',
  VNM: '704',
}

export function getVisitedCountries(profile: TravelerProfile): Record<string, string> {
  const result: Record<string, string> = {}
  for (const country of profile.countries) {
    const numericId = alpha3ToNumeric[country.countryCode] ?? country.countryCode
    result[numericId] = country.heroPic
  }
  return result
}

export function getVisitedSubdivisions(profile: TravelerProfile): Record<string, string> {
  const result: Record<string, string> = {}
  for (const country of profile.countries) {
    for (const sub of country.subdivisions) {
      result[sub.subdivisionCode] = sub.heroPic
    }
  }
  return result
}
