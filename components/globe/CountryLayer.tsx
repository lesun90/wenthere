'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Geometry } from 'geojson'
import { CountryFeature } from './CountryFeature'
import type { HoverInfo, GlobePalette, HeroTransform } from './types'
import type { ProfileIndex } from '../../data/seed'
import { prepareCountryRecords } from '../../lib/geo-cache'
import { registerCountryGeometry } from '../../lib/geo-registry'
import { latLngToVec3 } from '../../lib/geo'

interface Props {
  showSubdivisions: boolean
  photoOpacity: number
  onHoverChange: (info: HoverInfo | null) => void
  onCountryTap: (countryCode: string, centroid: [number, number]) => void
  onCountryHover?: (countryCode: string) => void
  palette: GlobePalette
  countryHeroOverrides?: Record<string, string>
  countryHeroTransforms?: Record<string, HeroTransform>
  profileIndex: ProfileIndex
}

export function CountryLayer({ showSubdivisions, photoOpacity, onHoverChange, onCountryTap, onCountryHover, palette, countryHeroOverrides = {}, countryHeroTransforms = {}, profileIndex }: Props) {
  const { camera, size } = useThree()
  const [topology, setTopology] = useState<Topology<{ countries: GeometryCollection }> | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hoveredIdRef = useRef<string | null>(null)

  useEffect(() => {
    fetch('/geo/countries-10m.json')
      .then(r => r.json())
      .then(setTopology)
      .catch(() => {})
  }, [])

  useEffect(() => {
    hoveredIdRef.current = null
    setHoveredId(null)
  }, [showSubdivisions])

  const features = useMemo(() => {
    if (!topology) return []
    return prepareCountryRecords(feature(topology, topology.objects.countries).features)
  }, [topology])

  const visitedCountries = useMemo(() => {
    const result: Record<string, string> = {}
    for (const [numericId, summary] of Object.entries(profileIndex.countrySummariesByNumericId)) {
      result[numericId] = countryHeroOverrides[summary.countryCode] ?? summary.heroPic
    }
    return result
  }, [countryHeroOverrides, profileIndex])

  useEffect(() => {
    for (const { id, geometry } of features) {
      const summary = profileIndex.countrySummariesByNumericId[id]
      if (summary?.countryCode) registerCountryGeometry(summary.countryCode, geometry)
    }
  }, [features, profileIndex])

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
    const otherPicUrls = summary
      ? summary.photos
          .map(photo => photo.url)
          .filter(url => url !== heroPicUrl)
          .slice(0, 4)
      : []
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
    if (!summary || summary.renderablePlaceCount === 0) return
    onCountryTap(summary.countryCode, centroid)
  }

  const dimmed = showSubdivisions
  const countryInteractionsEnabled = !showSubdivisions

  return (
    <>
      {features.map(({ id, name, centroid, geometry, fillGeometry, photoGeometry, lineGeometry }) => {
        const heroPicUrl = visitedCountries[id]
        return (
          <CountryFeature
            key={id}
            fillGeometry={fillGeometry}
            photoGeometry={photoGeometry}
            lineGeometry={lineGeometry}
            isHovered={countryInteractionsEnabled && hoveredId === id}
            dimmed={dimmed}
            interactive={countryInteractionsEnabled}
            photoOpacityTarget={photoOpacity}
            heroPicUrl={heroPicUrl}
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
