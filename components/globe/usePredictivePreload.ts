import { useEffect } from 'react'
import type { FeatureCollection } from 'geojson'
import { travelerProfile, type TravelerProfile } from '../../data/seed'
import { prepareSubdivisionRecords } from '../../lib/geo-cache'
import { preloadSharedTexture } from './useSharedTexture'

async function preloadSubdivisionGeometry(subdivisionCodes: Set<string>) {
  const response = await fetch('/geo/states-provinces-50m.json')
  const data = await response.json() as FeatureCollection
  prepareSubdivisionRecords(data.features.filter(feature => {
    const id = String(feature.properties?.adm1_code ?? '')
    return subdivisionCodes.has(id)
  }))
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
    if (country) preloadSharedTexture(country.heroPic)
  }, [hoveredCountryCode, profile])

  useEffect(() => {
    if (!focusedCountryCode) return
    const country = profile.countries.find(c => c.countryCode === focusedCountryCode)
    if (!country) return

    for (const sub of country.subdivisions) {
      preloadSharedTexture(sub.heroPic)
    }

    const codes = new Set(country.subdivisions.map(s => s.subdivisionCode))
    void preloadSubdivisionGeometry(codes).catch(() => {})
  }, [focusedCountryCode, profile])
}
