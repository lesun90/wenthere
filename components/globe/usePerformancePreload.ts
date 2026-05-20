import { useEffect, useRef } from 'react'
import type { FeatureCollection } from 'geojson'
import { travelerProfile } from '../../data/seed'
import { getVisitedSubdivisions } from '../../lib/geodata'
import { prepareSubdivisionRecords } from '../../lib/geo-cache'
import { preloadSharedTexture } from './useSharedTexture'

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number
  cancelIdleCallback?: (handle: number) => void
}

function scheduleIdle(callback: () => void) {
  const idleWindow = window as IdleWindow
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback)
    return () => idleWindow.cancelIdleCallback?.(handle)
  }

  const handle = window.setTimeout(callback, 80)
  return () => window.clearTimeout(handle)
}

function countryHeroUrls() {
  return travelerProfile.countries.map(country => country.heroPic)
}

function subdivisionHeroUrls() {
  return travelerProfile.countries.flatMap(country =>
    country.subdivisions.map(subdivision => subdivision.heroPic),
  )
}

async function preloadVisitedSubdivisionGeometry() {
  const visited = getVisitedSubdivisions(travelerProfile)
  const response = await fetch('/geo/states-provinces-50m.json')
  const data = await response.json() as FeatureCollection
  prepareSubdivisionRecords(data.features.filter(feature => {
    const id = String(feature.properties?.adm1_code ?? '')
    return !!visited[id]
  }))
}

export function usePerformancePreload(shouldPreloadSubdivisions: boolean) {
  const didPreloadCountriesRef = useRef(false)
  const didPreloadSubdivisionsRef = useRef(false)

  useEffect(() => {
    if (didPreloadCountriesRef.current) return
    didPreloadCountriesRef.current = true

    return scheduleIdle(() => {
      for (const url of countryHeroUrls()) preloadSharedTexture(url)
    })
  }, [])

  useEffect(() => {
    if (!shouldPreloadSubdivisions || didPreloadSubdivisionsRef.current) return
    didPreloadSubdivisionsRef.current = true

    return scheduleIdle(() => {
      void preloadVisitedSubdivisionGeometry().catch(() => {})
      for (const url of subdivisionHeroUrls()) preloadSharedTexture(url)
    })
  }, [shouldPreloadSubdivisions])
}
