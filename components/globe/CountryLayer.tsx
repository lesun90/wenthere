'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import { CountryFeature } from './CountryFeature'
import type { HoverInfo, GlobePalette } from './types'
import { travelerProfile } from '../../data/seed'
import { getVisitedCountries, getCountryMemoryByNumericId } from '../../lib/geodata'
import { prepareCountryRecords } from '../../lib/geo-cache'
import { latLngToVec3 } from '../../lib/geo'

interface Props {
  showSubdivisions: boolean
  photoOpacity: number
  onHoverChange: (info: HoverInfo | null) => void
  onCountryTap: (countryCode: string, centroid: [number, number]) => void
  palette: GlobePalette
}

export function CountryLayer({ showSubdivisions, photoOpacity, onHoverChange, onCountryTap, palette }: Props) {
  const { camera, size } = useThree()
  const [topology, setTopology] = useState<Topology<{ countries: GeometryCollection }> | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hoveredIdRef = useRef<string | null>(null)

  useEffect(() => {
    fetch('/geo/countries-50m.json')
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

  const visitedCountries = useMemo(() => getVisitedCountries(travelerProfile), [])
  const countryMemories = useMemo(() => getCountryMemoryByNumericId(travelerProfile), [])

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
    geometry: import('geojson').Geometry | null,
  ) {
    if (hoveredIdRef.current === id) return
    hoveredIdRef.current = id
    setHoveredId(id)
    if (!heroPicUrl) return
    const memory = countryMemories[id]
    const otherPicUrls = memory
      ? memory.subdivisions
          .flatMap(s => s.photos.map(p => p.url))
          .filter(u => u !== heroPicUrl)
          .slice(0, 4)
      : []
    const placeCount = memory
      ? memory.subdivisions.reduce((acc, s) => acc + s.photos.length, 0)
      : 0
    const { screenX, screenY } = projectToScreen(centroid)
    onHoverChange({ name, heroPicUrl, otherPicUrls, placeCount, screenX, screenY, geometry })
  }

  function handleUnhover() {
    if (hoveredIdRef.current === null) return
    hoveredIdRef.current = null
    setHoveredId(null)
    onHoverChange(null)
  }

  function handleTap(id: string, centroid: [number, number]) {
    const memory = countryMemories[id]
    if (!memory) return
    onCountryTap(memory.countryCode, centroid)
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
