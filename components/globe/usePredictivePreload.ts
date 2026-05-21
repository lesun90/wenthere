import { useEffect } from 'react'
import type { Feature } from 'geojson'
import { travelerProfile, type TravelerProfile } from '../../data/seed'
import { prepareSubdivisionRecords } from '../../lib/geo-cache'
import { hasCachedEntry, setCachedFeature, getCachedFeature } from '../../lib/subdivision-feature-cache'
import { preloadSharedTexture } from './useSharedTexture'

const subdivisionFetches = new Map<string, Promise<Feature | null>>()

function fetchSubdivisionFeature(subdivisionCode: string): Promise<Feature | null> {
  const cached = getCachedFeature(subdivisionCode)
  if (cached) return Promise.resolve(cached)
  if (hasCachedEntry(subdivisionCode)) return Promise.resolve(null)

  const inFlight = subdivisionFetches.get(subdivisionCode)
  if (inFlight) return inFlight

  const request = fetch(`/geo/subdivisions/${subdivisionCode}.geojson`)
    .then(r => r.json() as Promise<Feature>)
    .then(feature => {
      setCachedFeature(subdivisionCode, feature)
      return feature
    })
    .catch(() => {
      setCachedFeature(subdivisionCode, null)
      return null
    })
    .finally(() => {
      subdivisionFetches.delete(subdivisionCode)
    })

  subdivisionFetches.set(subdivisionCode, request)
  return request
}

export function preloadSubdivisionFile(subdivisionCode: string): void {
  if (hasCachedEntry(subdivisionCode)) return
  if (subdivisionFetches.has(subdivisionCode)) return

  void fetchSubdivisionFeature(subdivisionCode)
}

async function preloadSubdivisionGeometry(subdivisionCodes: string[]) {
  const results = await Promise.all(
    subdivisionCodes.map(code => fetchSubdivisionFeature(code))
  )
  prepareSubdivisionRecords(results.filter((f): f is Feature => f !== null))
}

export function usePredictivePreload({
  hoveredCountryCode,
  focusedCountryCode,
  profile = travelerProfile,
}: {
  hoveredCountryCode: string | null
  focusedCountryCode: string | null
  profile?: TravelerProfile
}) {
  useEffect(() => {
    if (!hoveredCountryCode) return
    const country = profile.countries.find(c => c.countryCode === hoveredCountryCode)
    if (!country) return
    preloadSharedTexture(country.heroPic)
  }, [hoveredCountryCode, profile])

  useEffect(() => {
    if (!focusedCountryCode) return
    const country = profile.countries.find(c => c.countryCode === focusedCountryCode)
    if (!country) return

    for (const sub of country.subdivisions) {
      preloadSharedTexture(sub.heroPic)
    }

    void preloadSubdivisionGeometry(country.subdivisions.map(s => s.subdivisionCode)).catch(() => {})
  }, [focusedCountryCode, profile])
}
