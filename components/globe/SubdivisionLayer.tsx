import { useEffect, useMemo, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import { SubdivisionFeature } from './SubdivisionFeature'
import { travelerProfile } from '../../data/seed'
import { getVisitedSubdivisions } from '../../lib/geodata'
import type { HoverInfo } from './CountryLayer'

interface Props {
  opacity: number
  onHoverChange: (info: HoverInfo | null) => void
}

export function SubdivisionLayer({ opacity, onHoverChange }: Props) {
  const [data, setData] = useState<FeatureCollection | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/geo/states-provinces-50m.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  const visitedSubdivisions = useMemo(() => getVisitedSubdivisions(travelerProfile), [])

  const visitedFeatures = useMemo(() => {
    if (!data) return []
    return data.features
      .map(f => ({ f, id: String(f.properties?.adm1_code ?? ''), heroPicUrl: visitedSubdivisions[String(f.properties?.adm1_code ?? '')] }))
      .filter(({ heroPicUrl }) => !!heroPicUrl)
  }, [data, visitedSubdivisions])

  function handleHover(id: string, name: string, heroPicUrl: string) {
    setHoveredId(id)
    onHoverChange({ name, heroPicUrl })
  }

  function handleUnhover() {
    setHoveredId(null)
    onHoverChange(null)
  }

  return (
    <>
      {visitedFeatures.map(({ f, id, heroPicUrl }) => {
        const name = (f.properties as Record<string, string> | null)?.name ?? ''
        return (
          <SubdivisionFeature
            key={id}
            feature={f}
            isHovered={hoveredId === id}
            opacity={opacity}
            heroPicUrl={heroPicUrl}
            onHover={() => handleHover(id, name, heroPicUrl)}
            onUnhover={handleUnhover}
          />
        )
      })}
    </>
  )
}
