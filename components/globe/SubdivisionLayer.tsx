'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type { FeatureCollection } from 'geojson'
import { SubdivisionFeature } from './SubdivisionFeature'
import type { HoverInfo, GlobePalette } from './types'
import { travelerProfile } from '../../data/seed'
import { getVisitedSubdivisions, getSubdivisionMemoryByCode } from '../../lib/geodata'
import { prepareSubdivisionRecords } from '../../lib/geo-cache'
import { latLngToVec3 } from '../../lib/geo'

interface Props {
  opacity: number
  onHoverChange: (info: HoverInfo | null) => void
  onSubdivisionTap: (subdivisionId: string, countryCode: string) => void
  palette: GlobePalette
}

export function SubdivisionLayer({ opacity, onHoverChange, onSubdivisionTap, palette }: Props) {
  const { camera, size } = useThree()
  const [data, setData] = useState<FeatureCollection | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hoveredIdRef = useRef<string | null>(null)

  useEffect(() => {
    fetch('/geo/states-provinces-50m.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  const visitedSubdivisions = useMemo(() => getVisitedSubdivisions(travelerProfile), [])
  const subdivisionMemories = useMemo(() => getSubdivisionMemoryByCode(travelerProfile), [])

  const visitedFeatures = useMemo(() => {
    if (!data) return []
    const rawVisitedFeatures = data.features.filter(feature => {
      const id = String(feature.properties?.adm1_code ?? '')
      return !!visitedSubdivisions[id]
    })
    return prepareSubdivisionRecords(rawVisitedFeatures)
      .map(record => ({
        ...record,
        heroPicUrl: visitedSubdivisions[record.id] as string | undefined,
      }))
      .filter((item): item is typeof item & { heroPicUrl: string } => !!item.heroPicUrl)
  }, [data, visitedSubdivisions])

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
    geometry: import('geojson').Geometry | null,
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
    onHoverChange({ name, heroPicUrl, otherPicUrls, placeCount, screenX, screenY, geometry })
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
