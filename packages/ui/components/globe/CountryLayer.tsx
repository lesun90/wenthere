'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Geometry } from 'geojson'
import { CountryFeature } from './CountryFeature'
import { firstOtherPhotoUrls } from './photoUtils'
import type { HoverInfo, GlobePalette, HeroTransform } from './types'
import type { ProfileIndex } from '../../lib/types'
import { prepareCountryRecords } from '../../lib/geo-cache'
import { registerCountryGeometry, registerCountryCentroid } from '../../lib/geo-registry'
import { listCountries } from '../../lib/geo-metadata'
import { latLngToVec3 } from '../../lib/geo'

let countriesTopology: Topology<{ countries: GeometryCollection }> | null = null
let countriesTopologyRequest: Promise<Topology<{ countries: GeometryCollection }> | null> | null = null

function fetchCountriesTopology(): Promise<Topology<{ countries: GeometryCollection }> | null> {
  if (countriesTopology) return Promise.resolve(countriesTopology)
  if (countriesTopologyRequest) return countriesTopologyRequest

  countriesTopologyRequest = import('../../data/geo/countries-10m.json')
    .then(mod => {
      countriesTopology = mod.default as unknown as Topology<{ countries: GeometryCollection }>
      return countriesTopology
    })
    .catch(() => null)
    .finally(() => {
      countriesTopologyRequest = null
    })

  return countriesTopologyRequest
}

interface Props {
  showSubdivisions: boolean
  photoOpacity: number
  onHoverChange: (info: HoverInfo | null) => void
  onCountryTap: (countryCode: string, centroid: [number, number]) => void
  onCountryHover?: (countryCode: string) => void
  interactionsEnabled?: boolean
  palette: GlobePalette
  countryHeroOverrides?: Record<string, string>
  countryHeroTransforms?: Record<string, HeroTransform>
  profileIndex: ProfileIndex
}

export function CountryLayer({ showSubdivisions, photoOpacity, onHoverChange, onCountryTap, onCountryHover, interactionsEnabled = true, palette, countryHeroOverrides = {}, countryHeroTransforms = {}, profileIndex }: Props) {
  const { camera, size } = useThree()
  const [topology, setTopology] = useState<Topology<{ countries: GeometryCollection }> | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hoveredIdRef = useRef<string | null>(null)

  useEffect(() => {
    let isActive = true
    void fetchCountriesTopology().then(topology => {
      if (isActive && topology) setTopology(topology)
    })
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    hoveredIdRef.current = null
    setHoveredId(null)
  }, [showSubdivisions])

  useEffect(() => {
    if (interactionsEnabled) return
    hoveredIdRef.current = null
    setHoveredId(null)
  }, [interactionsEnabled])

  const features = useMemo(() => {
    if (!topology) return []
    return prepareCountryRecords(feature(topology, topology.objects.countries).features)
  }, [topology])

  // Profile-independent numeric topology ID -> alpha-3 code, covering every
  // country (not just visited ones) so unvisited countries can still be
  // tapped and located.
  const numericIdToCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const country of listCountries()) map[country.numericId] = country.code
    return map
  }, [])

  const visitedCountries = useMemo(() => {
    const result: Record<string, string> = {}
    for (const [numericId, summary] of Object.entries(profileIndex.countrySummariesByNumericId)) {
      result[numericId] = countryHeroOverrides[summary.countryCode] ?? summary.heroPic
    }
    return result
  }, [countryHeroOverrides, profileIndex])

  useEffect(() => {
    for (const { id, geometry, centroid } of features) {
      const summary = profileIndex.countrySummariesByNumericId[id]
      const code = summary?.countryCode ?? numericIdToCode[id]
      if (code) registerCountryCentroid(code, centroid)
      if (summary?.countryCode) registerCountryGeometry(summary.countryCode, geometry)
    }
  }, [features, profileIndex, numericIdToCode])

  function projectToScreen(lonLat: [number, number]): { screenX: number; screenY: number } {
    const [lon, lat] = lonLat
    const vec = latLngToVec3(lat, lon, 1.001).project(camera)
    return {
      screenX: Math.round((vec.x + 1) / 2 * size.width),
      screenY: Math.round((-vec.y + 1) / 2 * size.height),
    }
  }

  function handleHover(
    id: string,
    name: string,
    heroPicUrl: string | undefined,
    centroid: [number, number],
    geometry: Geometry | null,
  ) {
    if (hoveredIdRef.current === id) return
    hoveredIdRef.current = id
    setHoveredId(id)
    if (!heroPicUrl) return
    const summary = profileIndex.countrySummariesByNumericId[id]
    const otherPicUrls = summary ? firstOtherPhotoUrls(summary.photos, heroPicUrl, 4) : []
    const placeCount = summary?.renderablePlaceCount ?? 0
    const { screenX, screenY } = projectToScreen(centroid)
    const heroTransform = summary ? countryHeroTransforms[summary.countryCode] ?? summary.heroTransform : undefined
    if (summary?.countryCode && placeCount > 0) onCountryHover?.(summary.countryCode)
    onHoverChange({ name, heroPicUrl, heroTransform, otherPicUrls, placeCount, screenX, screenY, geometry })
  }

  function handleUnhover() {
    if (hoveredIdRef.current === null) return
    hoveredIdRef.current = null
    setHoveredId(null)
    onHoverChange(null)
  }

  function handleTap(id: string, centroid: [number, number]) {
    const summary = profileIndex.countrySummariesByNumericId[id]
    const code = summary?.countryCode ?? numericIdToCode[id]
    if (!code) return
    onCountryTap(code, centroid)
  }

  const dimmed = showSubdivisions
  const countryInteractionsEnabled = !showSubdivisions
  const countryHoverEnabled = interactionsEnabled && !showSubdivisions

  return (
    <>
      {features.map(({ id, name, centroid, geometry, fillGeometry, photoGeometry, lineGeometry }) => {
        const heroPicUrl = visitedCountries[id]
        const summary = profileIndex.countrySummariesByNumericId[id]
        return (
          <CountryFeature
            key={id}
            fillGeometry={fillGeometry}
            photoGeometry={photoGeometry}
            lineGeometry={lineGeometry}
            isHovered={countryHoverEnabled && hoveredId === id}
            dimmed={dimmed}
            interactive={countryInteractionsEnabled}
            hoverEnabled={countryHoverEnabled}
            photoOpacityTarget={photoOpacity}
            heroPicUrl={heroPicUrl}
            hoverHeroTransform={summary ? countryHeroTransforms[summary.countryCode] ?? summary.heroTransform : undefined}
            palette={palette}
            onHover={() => handleHover(id, name, heroPicUrl, centroid, geometry)}
            onUnhover={handleUnhover}
            onClick={() => handleTap(id, centroid)}
          />
        )
      })}
    </>
  )
}
