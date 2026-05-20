import { useEffect, useMemo, useState } from 'react'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import { CountryFeature } from './CountryFeature'
import { travelerProfile } from '../../data/seed'
import { getVisitedCountries } from '../../lib/geodata'

export interface HoverInfo {
  name: string
  heroPicUrl: string
}

interface Props {
  detailLevel: 'country' | 'subdivision'
  photoOpacity: number
  onHoverChange: (info: HoverInfo | null) => void
}

export function CountryLayer({ detailLevel, photoOpacity, onHoverChange }: Props) {
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
  }, [detailLevel])

  const features = useMemo(() => {
    if (!topology) return []
    const all = feature(topology, topology.objects.countries).features
    const seen = new Set<string>()
    return all.filter(f => {
      const key = f.id != null ? String(f.id) : (f.properties as Record<string, string> | null)?.name ?? ''
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [topology])

  const visitedCountries = useMemo(() => getVisitedCountries(travelerProfile), [])

  const dimmed = detailLevel === 'subdivision'

  function handleHover(id: string, name: string, heroPicUrl: string | undefined) {
    setHoveredId(id)
    if (heroPicUrl) onHoverChange({ name, heroPicUrl })
  }

  function handleUnhover() {
    setHoveredId(null)
    onHoverChange(null)
  }

  return (
    <>
      {features.map(f => {
        const name = (f.properties as Record<string, string> | null)?.name ?? ''
        const id = f.id != null ? String(f.id) : name
        const heroPicUrl = visitedCountries[id]
        return (
          <CountryFeature
            key={id}
            feature={f}
            isHovered={hoveredId === id}
            dimmed={dimmed}
            photoOpacity={photoOpacity}
            heroPicUrl={heroPicUrl}
            onHover={() => handleHover(id, name, heroPicUrl)}
            onUnhover={handleUnhover}
          />
        )
      })}
    </>
  )
}
