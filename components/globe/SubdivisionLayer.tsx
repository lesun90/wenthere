'use client'

import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type { FeatureCollection } from 'geojson'
import { SubdivisionFeature } from './SubdivisionFeature'
import type { HoverInfo } from './types'
import { travelerProfile } from '../../data/seed'
import { getVisitedSubdivisions, getSubdivisionMemoryByCode } from '../../lib/geodata'
import { featureCentroid } from '../../lib/geomath'
import { latLngToVec3 } from '../../lib/geo'

interface Props {
  opacity: number
  onHoverChange: (info: HoverInfo | null) => void
  onSubdivisionTap: (subdivisionId: string, countryCode: string) => void
}

export function SubdivisionLayer({ opacity, onHoverChange, onSubdivisionTap }: Props) {
  const { camera, size } = useThree()
  const [data, setData] = useState<FeatureCollection | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

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
    return data.features
      .map(f => ({
        f,
        id: String(f.properties?.adm1_code ?? ''),
        heroPicUrl: visitedSubdivisions[String(f.properties?.adm1_code ?? '')] as string | undefined,
        centroid: featureCentroid(f),
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
    setHoveredId(null)
    onHoverChange(null)
  }

  return (
    <>
      {visitedFeatures.map(({ f, id, heroPicUrl, centroid }) => {
        const props = f.properties as Record<string, string> | null
        const name = props?.name ?? ''
        const adm0Code = props?.adm0_a3 ?? ''
        return (
          <SubdivisionFeature
            key={id}
            feature={f}
            isHovered={hoveredId === id}
            opacity={opacity}
            heroPicUrl={heroPicUrl}
            onHover={() => handleHover(id, name, heroPicUrl, centroid, f.geometry ?? null)}
            onUnhover={handleUnhover}
            onClick={() => onSubdivisionTap(id, adm0Code)}
          />
        )
      })}
    </>
  )
}
