import { useEffect } from 'react'
import { travelerProfile, type TravelerProfile } from '../../data/seed'
import { prepareSubdivisionRecords } from '../../lib/geo-cache'
import { preloadSharedTexture } from './useSharedTexture'

const preloadedSubdivisionFiles = new Set<string>()

export function preloadSubdivisionFile(subdivisionCode: string): void {
  if (preloadedSubdivisionFiles.has(subdivisionCode)) return
  preloadedSubdivisionFiles.add(subdivisionCode)
  fetch(`/geo/subdivisions/${subdivisionCode}.geojson`).catch(() => {})
}

async function preloadSubdivisionGeometry(subdivisionCodes: string[]) {
  const results = await Promise.all(
    subdivisionCodes.map(code =>
      preloadedSubdivisionFiles.has(code)
        ? fetch(`/geo/subdivisions/${code}.geojson`).then(r => r.json())
        : (preloadSubdivisionFile(code), fetch(`/geo/subdivisions/${code}.geojson`).then(r => r.json()))
    )
  )
  prepareSubdivisionRecords(results.filter(Boolean))
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
