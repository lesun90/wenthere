import type { Geometry } from 'geojson'

// Module-level registry keyed by stable identifiers.
// Populated by CountryLayer and SubdivisionLayer as GeoJSON is processed;
// queried by GalleryPanel using the IDs already present in photo metadata.
const subdivisionGeoms = new Map<string, Geometry | null>()
const countryGeoms = new Map<string, Geometry | null>() // keyed by alpha-3

export function registerSubdivisionGeometry(code: string, geometry: Geometry | null) {
  subdivisionGeoms.set(code, geometry)
}

export function registerCountryGeometry(alphaCode: string, geometry: Geometry | null) {
  countryGeoms.set(alphaCode, geometry)
}

export function getSubdivisionGeometry(code: string): Geometry | null {
  return subdivisionGeoms.get(code) ?? null
}

export function getCountryGeometry(alphaCode: string): Geometry | null {
  return countryGeoms.get(alphaCode) ?? null
}
