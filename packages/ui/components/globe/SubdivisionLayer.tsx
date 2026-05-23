'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type { Feature, Geometry } from 'geojson'
import { SubdivisionFeature } from './SubdivisionFeature'
import { firstOtherPhotoUrls } from './photoUtils'
import type { HoverInfo, GlobePalette, HeroTransform } from './types'
import type { ProfileIndex } from '@beenthere/domain/lib/types'
import { prepareSubdivisionRecords } from '../../lib/geo-cache'
import { registerSubdivisionGeometry } from '../../lib/geo-registry'
import { latLngToVec3 } from '../../lib/geo'
import { getCachedFeature, hasCachedEntry } from '../../lib/subdivision-feature-cache'
import { fetchSubdivisionFeature } from './usePredictivePreload'

const SUBDIVISION_FETCH_BATCH_SIZE = 8

function subdivisionFeatureId(feature: Feature): string {
  return String(feature.properties?.adm1_code ?? '')
}

function mergeUniqueSubdivisionFeatures(existing: Feature[], incoming: Feature[]): Feature[] {
  const seen = new Set<string>()
  const merged: Feature[] = []

  for (const feature of existing) {
    const id = subdivisionFeatureId(feature)
    if (!id || seen.has(id)) continue
    seen.add(id)
    merged.push(feature)
  }

  for (const feature of incoming) {
    const id = subdivisionFeatureId(feature)
    if (!id || seen.has(id)) continue
    seen.add(id)
    merged.push(feature)
  }

  return merged
}

interface Props {
  opacity: number
  onHoverChange: (info: HoverInfo | null) => void
  onSubdivisionTap: (subdivisionId: string, countryCode: string) => void
  interactionsEnabled?: boolean
  palette: GlobePalette
  heroOverrides?: Record<string, string>
  heroTransforms?: Record<string, HeroTransform>
  profileIndex: ProfileIndex
}

export function SubdivisionLayer({ opacity, onHoverChange, onSubdivisionTap, interactionsEnabled = true, palette, heroOverrides = {}, heroTransforms = {}, profileIndex }: Props) {
  const { camera, size } = useThree()
  const [features, setFeatures] = useState<Feature[]>([])
  const pendingRef = useRef<Feature[]>([])
  const rafRef = useRef<number | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hoveredIdRef = useRef<string | null>(null)
  const lastHoverPayloadRef = useRef<(Omit<HoverInfo, 'heroTransform'> & { id: string }) | null>(null)

  const subdivisionCodes = profileIndex.renderableSubdivisionCodes

  useEffect(() => {
    if (interactionsEnabled) return
    hoveredIdRef.current = null
    lastHoverPayloadRef.current = null
    setHoveredId(null)
  }, [interactionsEnabled])

  useEffect(() => {
    let isActive = true

    if (subdivisionCodes.length === 0) {
      setFeatures([])
      return () => {
        isActive = false
      }
    }

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
        if (batch.length > 0) {
          setFeatures(prev => mergeUniqueSubdivisionFeatures(prev, batch))
        }
      })
    }

    async function loadMissingSubdivisions() {
      for (let i = 0; i < missing.length && isActive; i += SUBDIVISION_FETCH_BATCH_SIZE) {
        const batch = missing.slice(i, i + SUBDIVISION_FETCH_BATCH_SIZE)
        const loaded = await Promise.all(batch.map(code => fetchSubdivisionFeature(code).catch(() => null)))
        if (!isActive) return

        for (const f of loaded) {
          if (f) pendingRef.current.push(f)
        }
        scheduleFlush()
      }
    }

    void loadMissingSubdivisions()

    return () => {
      isActive = false
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      pendingRef.current = []
    }
  }, [subdivisionCodes])

  const visitedSubdivisions = useMemo(() => {
    const result: Record<string, string> = {}
    for (const [subdivisionCode, summary] of Object.entries(profileIndex.subdivisionSummariesByCode)) {
      result[subdivisionCode] = heroOverrides[subdivisionCode] ?? summary.heroPic
    }
    return result
  }, [heroOverrides, profileIndex])

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

  // Re-fire hover info when heroTransforms updates for the currently hovered subdivision
  // so FloatingCard reflects framing changes without requiring mouse movement.
  useEffect(() => {
    const payload = lastHoverPayloadRef.current
    if (!payload || hoveredIdRef.current !== payload.id) return
    const summary = profileIndex.subdivisionSummariesByCode[payload.id]
    onHoverChange({
      ...payload,
      heroTransform: heroTransforms[payload.id] ?? summary?.heroTransform,
    })
  }, [heroTransforms])

  function handleHover(
    id: string,
    name: string,
    heroPicUrl: string,
    centroid: [number, number],
    geometry: Geometry | null,
  ) {
    if (!interactionsEnabled) return
    if (hoveredIdRef.current === id) return
    hoveredIdRef.current = id
    setHoveredId(id)
    const summary = profileIndex.subdivisionSummariesByCode[id]
    const otherPicUrls = summary ? firstOtherPhotoUrls(summary.photos, heroPicUrl, 4) : []
    const placeCount = summary ? summary.photos.length : 0
    const { screenX, screenY } = projectToScreen(centroid)
    const payload = { id, name, heroPicUrl, otherPicUrls, placeCount, screenX, screenY, geometry }
    lastHoverPayloadRef.current = payload
    onHoverChange({
      ...payload,
      heroTransform: heroTransforms[id] ?? summary?.heroTransform,
    })
  }

  function handleUnhover() {
    if (hoveredIdRef.current === null) return
    hoveredIdRef.current = null
    lastHoverPayloadRef.current = null
    setHoveredId(null)
    onHoverChange(null)
  }

  const subdivisionInteractionsEnabled = opacity > 0

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
            interactive={subdivisionInteractionsEnabled}
            hoverEnabled={interactionsEnabled}
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
