'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type { Feature, Geometry } from 'geojson'
import { SubdivisionFeature } from './SubdivisionFeature'
import type { HoverInfo, GlobePalette, HeroTransform } from './types'
import { travelerProfile, type TravelerProfile } from '../../data/seed'
import { getVisitedSubdivisions, getSubdivisionMemoryByCode } from '../../lib/geodata'
import { prepareSubdivisionRecords } from '../../lib/geo-cache'
import { registerSubdivisionGeometry } from '../../lib/geo-registry'
import { latLngToVec3 } from '../../lib/geo'
import { getCachedFeature, setCachedFeature, hasCachedEntry } from '../../lib/subdivision-feature-cache'

interface Props {
  opacity: number
  onHoverChange: (info: HoverInfo | null) => void
  onSubdivisionTap: (subdivisionId: string, countryCode: string) => void
  palette: GlobePalette
  heroOverrides?: Record<string, string>
  heroTransforms?: Record<string, HeroTransform>
  profile?: TravelerProfile
}

export function SubdivisionLayer({ opacity, onHoverChange, onSubdivisionTap, palette, heroOverrides = {}, heroTransforms = {}, profile = travelerProfile }: Props) {
  const { camera, size } = useThree()
  const [features, setFeatures] = useState<Feature[]>([])
  const pendingRef = useRef<Feature[]>([])
  const rafRef = useRef<number | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hoveredIdRef = useRef<string | null>(null)

  const subdivisionCodes = useMemo(
    () => profile.countries.flatMap(c => c.subdivisions.map(s => s.subdivisionCode)),
    [profile],
  )

  useEffect(() => {
    if (subdivisionCodes.length === 0) return

    const cached: Feature[] = []
    const missing: string[] = []
    for (const code of subdivisionCodes) {
      if (hasCachedEntry(code)) {
        const f = getCachedFeature(code)
        if (f) cached.push(f)
        // null entry = known 404, skip silently
      } else {
        missing.push(code)
      }
    }

    setFeatures(cached)

    function scheduleFlush() {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const batch = pendingRef.current.splice(0)
        if (batch.length > 0) setFeatures(prev => [...prev, ...batch])
      })
    }

    for (const code of missing) {
      fetch(`/geo/subdivisions/${code}.geojson`)
        .then(r => r.json() as Promise<Feature>)
        .then(f => {
          setCachedFeature(code, f)
          pendingRef.current.push(f)
          scheduleFlush()
        })
        .catch(() => setCachedFeature(code, null))
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      pendingRef.current = []
    }
  }, [subdivisionCodes])

  const visitedSubdivisions = useMemo(
    () => getVisitedSubdivisions(profile, heroOverrides),
    [heroOverrides, profile],
  )
  const subdivisionMemories = useMemo(() => getSubdivisionMemoryByCode(profile), [profile])

  const visitedFeatures = useMemo(() => {
    const rawVisitedFeatures = features.filter(feature => {
      const id = String(feature.properties?.adm1_code ?? '')
      return !!visitedSubdivisions[id]
    })
    return prepareSubdivisionRecords(rawVisitedFeatures)
      .map(record => ({
        ...record,
        heroPicUrl: visitedSubdivisions[record.id] as string | undefined,
      }))
      .filter((item): item is typeof item & { heroPicUrl: string } => !!item.heroPicUrl)
  }, [features, visitedSubdivisions])

  useEffect(() => {
    for (const { id, geometry } of visitedFeatures) {
      registerSubdivisionGeometry(id, geometry)
    }
  }, [visitedFeatures])

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
    heroPicUrl: string,
    centroid: [number, number],
    geometry: Geometry | null,
  ) {
    if (hoveredIdRef.current === id) return
    hoveredIdRef.current = id
    setHoveredId(id)
    const memory = subdivisionMemories[id]
    const otherPicUrls = memory
      ? memory.photos.filter(p => p.url !== heroPicUrl).map(p => p.url).slice(0, 4)
      : []
    const placeCount = memory ? memory.photos.length : 0
    const { screenX, screenY } = projectToScreen(centroid)
    onHoverChange({ name, heroPicUrl, heroTransform: heroTransforms[id], otherPicUrls, placeCount, screenX, screenY, geometry })
  }

  function handleUnhover() {
    if (hoveredIdRef.current === null) return
    hoveredIdRef.current = null
    setHoveredId(null)
    onHoverChange(null)
  }

  return (
    <>
      {visitedFeatures.map(({ id, name, countryCode, heroPicUrl, centroid, geometry, fillGeometry, lineGeometry }) => {
        return (
          <SubdivisionFeature
            key={id}
            fillGeometry={fillGeometry}
            lineGeometry={lineGeometry}
            isHovered={hoveredId === id}
            opacityTarget={opacity}
            heroPicUrl={heroPicUrl}
            heroTransform={heroTransforms[id]}
            palette={palette}
            onHover={() => handleHover(id, name, heroPicUrl, centroid, geometry)}
            onUnhover={handleUnhover}
            onClick={() => onSubdivisionTap(id, countryCode)}
          />
        )
      })}
    </>
  )
}
