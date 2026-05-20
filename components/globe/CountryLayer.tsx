'use client'

import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import { CountryFeature } from './CountryFeature'
import type { HoverInfo } from './types'
import { travelerProfile } from '../../data/seed'
import { getVisitedCountries, getCountryMemoryByNumericId } from '../../lib/geodata'
import { featureCentroid } from '../../lib/geomath'
import { latLngToVec3 } from '../../lib/geo'

interface Props {
  showSubdivisions: boolean
  photoOpacity: number
  onHoverChange: (info: HoverInfo | null) => void
  onCountryTap: (countryCode: string, centroid: [number, number]) => void
}

export function CountryLayer({ showSubdivisions, photoOpacity, onHoverChange, onCountryTap }: Props) {
  const { camera, size } = useThree()
  const [topology, setTopology] = useState<Topology<{ countries: GeometryCollection }> | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/geo/countries-50m.json')
      .then(r => r.json())
      .then(setTopology)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setHoveredId(null)
  }, [showSubdivisions])

  const features = useMemo(() => {
    if (!topology) return []
    const all = feature(topology, topology.objects.countries).features
    const seen = new Set<string>()
    return all
      .filter(f => {
        const key = f.id != null ? String(f.id) : (f.properties as Record<string, string> | null)?.name ?? ''
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(f => ({
        f,
        id: f.id != null ? String(f.id) : (f.properties as Record<string, string> | null)?.name ?? '',
        centroid: featureCentroid(f),
      }))
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

  function handleHover(id: string, name: string, heroPicUrl: string | undefined, centroid: [number, number]) {
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
    onHoverChange({ name, heroPicUrl, otherPicUrls, placeCount, screenX, screenY })
  }

  function handleUnhover() {
    setHoveredId(null)
    onHoverChange(null)
  }

  function handleTap(id: string, centroid: [number, number]) {
    const memory = countryMemories[id]
    if (!memory) return
    onCountryTap(memory.countryCode, centroid)
  }

  const dimmed = showSubdivisions

  return (
    <>
      {features.map(({ f, id, centroid }) => {
        const name = (f.properties as Record<string, string> | null)?.name ?? ''
        const heroPicUrl = visitedCountries[id]
        return (
          <CountryFeature
            key={id}
            feature={f}
            isHovered={hoveredId === id}
            dimmed={dimmed}
            photoOpacity={photoOpacity}
            heroPicUrl={heroPicUrl}
            onHover={() => handleHover(id, name, heroPicUrl, centroid)}
            onUnhover={handleUnhover}
            onClick={() => handleTap(id, centroid)}
          />
        )
      })}
    </>
  )
}
