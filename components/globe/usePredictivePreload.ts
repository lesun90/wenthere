import { useEffect } from 'react'
import type { Feature } from 'geojson'
import type { ProfileIndex } from '../../data/seed'
import { prepareSubdivisionRecords } from '../../lib/geo-cache'
import { hasCachedEntry, setCachedFeature, getCachedFeature } from '../../lib/subdivision-feature-cache'
import { preloadSharedTexture } from './useSharedTexture'

const subdivisionFetches = new Map<string, Promise<Feature | null>>()

export function fetchSubdivisionFeature(subdivisionCode: string): Promise<Feature | null> {
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

async function preloadSubdivisionGeometry(subdivisionCodes: string[]) {
  const results = await Promise.all(
    subdivisionCodes.map(code => fetchSubdivisionFeature(code))
  )
  prepareSubdivisionRecords(results.filter((f): f is Feature => f !== null))
}

export function usePredictivePreload({
  hoveredCountryCode,
  focusedCountryCode,
  profileIndex,
}: {
  hoveredCountryCode: string | null
  focusedCountryCode: string | null
  profileIndex: ProfileIndex
}) {
  useEffect(() => {
    if (!hoveredCountryCode) return
    const country = profileIndex.countrySummariesByCode[hoveredCountryCode]
    if (!country) return
    preloadSharedTexture(country.heroPic)
  }, [hoveredCountryCode, profileIndex])

  useEffect(() => {
    if (!focusedCountryCode) return
    const country = profileIndex.countrySummariesByCode[focusedCountryCode]
    if (!country) return

    for (const subdivisionCode of country.subdivisionCodes) {
      const sub = profileIndex.subdivisionSummariesByCode[subdivisionCode]
      if (sub) preloadSharedTexture(sub.heroPic)
    }

    const renderableCodes = country.subdivisionCodes.filter(code =>
      profileIndex.renderableSubdivisionCodes.includes(code),
    )
    void preloadSubdivisionGeometry(renderableCodes).catch(() => {})
  }, [focusedCountryCode, profileIndex])
}
