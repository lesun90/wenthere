import { useEffect } from 'react'
import type { Feature } from 'geojson'
import { travelerProfile, type TravelerProfile } from '../../data/seed'
import { prepareSubdivisionRecords } from '../../lib/geo-cache'
import { preloadSharedTexture } from './useSharedTexture'
import { hasCachedFeature, setCachedFeature, getCachedFeature } from '../../lib/subdivision-feature-cache'

export function preloadSubdivisionFile(subdivisionCode: string): void {
  if (hasCachedFeature(subdivisionCode)) return
  fetch(`/geo/subdivisions/${subdivisionCode}.geojson`)
    .then(r => r.json())
    .then((feature: Feature) => setCachedFeature(subdivisionCode, feature))
    .catch(() => {})
}

async function preloadSubdivisionGeometry(subdivisionCodes: string[]) {
  const results = await Promise.all(
    subdivisionCodes.map(code => {
      const cached = getCachedFeature(code)
      if (cached) return cached
      return fetch(`/geo/subdivisions/${code}.geojson`)
        .then(r => r.json() as Promise<Feature>)
        .then(f => { setCachedFeature(code, f); return f })
        .catch(() => null)
    })
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
    for (const sub of country.subdivisions) preloadSubdivisionFile(sub.subdivisionCode)
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
