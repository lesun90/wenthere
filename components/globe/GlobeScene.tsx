'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { EarthMesh } from './EarthMesh'
import { CountryLayer } from './CountryLayer'
import { SubdivisionLayer } from './SubdivisionLayer'
import { FloatingCard } from './FloatingCard'
import { GalleryPanel } from './GalleryPanel'
import { usePredictivePreload } from './usePredictivePreload'
import { useTheme } from '../../lib/theme-context'
import type { HoverInfo, GlobeState, GlobePalette, HeroTransform } from './types'
import { latLngToVec3 } from '../../lib/geo'
import { travelerProfile, type TravelerProfile } from '../../data/seed'
import { buildProfileIndex } from '../../lib/geodata'

const MODE_TRANSITION_MS = 300
const MIN_CAMERA_DISTANCE = 1.2
const MAX_CAMERA_DISTANCE = 6
const ZOOM_SPEED = 0.65
const FLY_DURATION = 700
const ENTER_DETAIL_DISTANCE = 1.85
const EXIT_DETAIL_DISTANCE = 2.35
const COUNTRY_FLY_DISTANCE = 1.65

const GLOBE_PALETTES: Record<'dark' | 'light', GlobePalette> = {
  dark: {
    background: '#080c14',
    earth: '#0A1628',
    atmosphereColor: '#ffffff',
    atmosphereOpacity: 0.07,
    countryFill: '#1E2D3D',
    countryFillHover: '#263D52',
    countryBorder: '#ffffff',
    subdivisionBorder: '#c8d3e1',
    subdivisionBorderHover: '#ffffff',
  },
  light: {
    background: '#FFFFFF',
    earth: '#EDECEA',
    atmosphereColor: '#94A3B8',
    atmosphereOpacity: 0.12,
    countryFill: '#B8B0A4',
    countryFillHover: '#A8A098',
    countryBorder: '#ffffff',
    subdivisionBorder: '#D0C8C0',
    subdivisionBorderHover: '#ffffff',
  },
}

type DetailLevel = 'world' | 'detail'

function CameraLight() {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const offset = useRef(new THREE.Vector3(2, 2, 4))
  const pos = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    if (!lightRef.current) return
    pos.current.copy(offset.current).applyQuaternion(camera.quaternion).add(camera.position)
    lightRef.current.position.copy(pos.current)
  })

  return <directionalLight ref={lightRef} color="#ffffff" intensity={2.0} />
}

type FlyJob = {
  startPos: THREE.Vector3
  endDir: THREE.Vector3
  startDist: number
  endDist: number
  startedAt: number
}

function CameraController({
  flyTarget,
  targetDist,
  orbitRef,
  onComplete,
}: {
  flyTarget: [number, number] | null
  targetDist?: number
  orbitRef: React.RefObject<React.ElementRef<typeof OrbitControls> | null>
  onComplete: () => void
}) {
  const { camera } = useThree()
  const jobRef = useRef<FlyJob | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!flyTarget) return
    const [lon, lat] = flyTarget
    const endDir = latLngToVec3(lat, lon, 1).normalize()
    const startDist = camera.position.length()
    jobRef.current = {
      startPos: camera.position.clone(),
      endDir,
      startDist,
      endDist: targetDist ?? startDist,
      startedAt: performance.now(),
    }
    if (orbitRef.current) orbitRef.current.enabled = false
  }, [flyTarget])

  useFrame(() => {
    const job = jobRef.current
    if (!job) return

    const t = Math.min((performance.now() - job.startedAt) / FLY_DURATION, 1)
    const eased = 1 - Math.pow(1 - t, 3)

    const currentDist = job.startDist + (job.endDist - job.startDist) * eased
    const dir = job.startPos.clone().normalize()
    dir.lerp(job.endDir, eased).normalize()
    camera.position.copy(dir.multiplyScalar(currentDist))
    camera.lookAt(0, 0, 0)

    if (t >= 1) {
      jobRef.current = null
      if (orbitRef.current) orbitRef.current.enabled = true
      onCompleteRef.current()
    }
  })

  return null
}

function ZoomDetailController({
  detailLevel,
  onDetailLevelChange,
  disabled,
}: {
  detailLevel: DetailLevel
  onDetailLevelChange: (level: DetailLevel) => void
  disabled?: boolean
}) {
  const { camera } = useThree()
  const detailLevelRef = useRef(detailLevel)
  const disabledRef = useRef(!!disabled)

  useEffect(() => {
    detailLevelRef.current = detailLevel
  }, [detailLevel])

  useEffect(() => {
    disabledRef.current = !!disabled
  }, [disabled])

  useFrame(() => {
    if (disabledRef.current) return
    const distance = camera.position.length()
    const current = detailLevelRef.current

    if (current === 'world' && distance <= ENTER_DETAIL_DISTANCE) {
      detailLevelRef.current = 'detail'
      onDetailLevelChange('detail')
      return
    }

    if (current === 'detail' && distance >= EXIT_DETAIL_DISTANCE) {
      detailLevelRef.current = 'world'
      onDetailLevelChange('world')
    }
  })

  return null
}

function useLayerPresence(show: boolean) {
  const [present, setPresent] = useState(show)

  useEffect(() => {
    if (show) {
      setPresent(true)
      return
    }

    const timeout = window.setTimeout(() => setPresent(false), MODE_TRANSITION_MS)
    return () => window.clearTimeout(timeout)
  }, [show])

  return present
}

export function GlobeScene({ profile = travelerProfile }: { profile?: TravelerProfile }) {
  const { theme } = useTheme()
  const palette = GLOBE_PALETTES[theme]
  const profileIndex = useMemo(() => buildProfileIndex(profile), [profile])

  const [navStack, setNavStack] = useState<GlobeState[]>([{ level: 'world' }])
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const pendingFlyRef = useRef<{ countryCode: string; center: [number, number] } | null>(null)
  const orbitRef = useRef<React.ElementRef<typeof OrbitControls>>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [clickOrigin, setClickOrigin] = useState<{ x: number; y: number } | null>(null)

  const [hoveredCountryCode, setHoveredCountryCode] = useState<string | null>(null)
  const [focusedCountryCode, setFocusedCountryCode] = useState<string | null>(null)

  const [subdivisionHeroOverrides, setSubdivisionHeroOverrides] = useState<Record<string, string>>({})
  const [countryHeroOverrides, setCountryHeroOverrides] = useState<Record<string, string>>({})
  const [subdivisionHeroTransforms, setSubdivisionHeroTransforms] = useState<Record<string, HeroTransform>>({})
  const [countryHeroTransforms, setCountryHeroTransforms] = useState<Record<string, HeroTransform>>({})

  const seedCountryHeroes = useMemo(() => {
    const result: Record<string, string> = {}
    for (const [countryCode, summary] of Object.entries(profileIndex.countrySummariesByCode)) {
      result[countryCode] = summary.heroPic
    }
    return result
  }, [profileIndex])
  const seedCountryTransforms = useMemo(() => {
    const result: Record<string, HeroTransform> = {}
    for (const [countryCode, summary] of Object.entries(profileIndex.countrySummariesByCode)) {
      if (summary.heroTransform) result[countryCode] = summary.heroTransform
    }
    return result
  }, [profileIndex])
  const seedSubdivisionTransforms = useMemo(() => {
    const result: Record<string, HeroTransform> = {}
    for (const [subdivisionCode, summary] of Object.entries(profileIndex.subdivisionSummariesByCode)) {
      if (summary.heroTransform) result[subdivisionCode] = summary.heroTransform
    }
    return result
  }, [profileIndex])

  const current = navStack[navStack.length - 1]
  const showSubdivisions = current.level === 'detail' || current.level === 'subdivision' || current.level === 'gallery'
  const detailLevel: DetailLevel = showSubdivisions ? 'detail' : 'world'
  const galleryOpen = current.level === 'gallery'

  const countryPhotoOpacity = showSubdivisions ? 0 : 1
  const subdivisionOpacity = showSubdivisions ? 1 : 0
  const shouldRenderSubdivisions = useLayerPresence(showSubdivisions)

  usePredictivePreload({ hoveredCountryCode, focusedCountryCode, profileIndex })

  function push(state: GlobeState) {
    setNavStack(s => [...s, state])
  }

  function back() {
    setNavStack(s => s.length > 1 ? s.slice(0, -1) : s)
  }

  function handleZoomDetailChange(level: DetailLevel) {
    setNavStack(stack => {
      const top = stack[stack.length - 1]

      if (level === 'detail') {
        return top.level === 'world' ? [...stack, { level: 'detail' }] : stack
      }

      return top.level === 'world' ? stack : [{ level: 'world' }]
    })
  }

  useEffect(() => {
    setHoverInfo(null)
  }, [current.level])

  useEffect(() => {
    function onResize() {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight })
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function handleCountryHover(countryCode: string) {
    setHoveredCountryCode(countryCode)
  }

  function handleCountryTap(countryCode: string, centroid: [number, number]) {
    if (current.level !== 'world') return
    setFocusedCountryCode(countryCode)
    pendingFlyRef.current = { countryCode, center: centroid }
    setFlyTarget(centroid)
  }

  function handleFlyComplete() {
    const job = pendingFlyRef.current
    if (!job) return
    pendingFlyRef.current = null
    setFlyTarget(null)
    push({ level: 'subdivision', countryCode: job.countryCode, countryCenter: job.center })
  }

  function handleSubdivisionTap(subdivisionId: string, countryCode: string) {
    const galleryState: GlobeState = {
      level: 'gallery',
      subdivisionId,
      countryCode,
    }

    if (current.level === 'gallery') {
      setNavStack(s => [...s.slice(0, -1), galleryState])
      return
    }
    if (current.level === 'detail' || current.level === 'subdivision') {
      push(galleryState)
    }
  }

  function handleSubdivisionHeroChange(subdivisionId: string, heroUrl: string) {
    setSubdivisionHeroOverrides(prev => ({ ...prev, [subdivisionId]: heroUrl }))
  }

  function handleCountryHeroChange(countryCode: string, heroUrl: string) {
    setCountryHeroOverrides(prev => ({ ...prev, [countryCode]: heroUrl }))
  }

  function handleSubdivisionTransformChange(subdivisionId: string, transform: HeroTransform) {
    setSubdivisionHeroTransforms(prev => ({ ...prev, [subdivisionId]: transform }))
  }

  function handleCountryTransformChange(countryCode: string, transform: HeroTransform) {
    setCountryHeroTransforms(prev => ({ ...prev, [countryCode]: transform }))
  }

  const galleryState = current.level === 'gallery'
    ? (current as Extract<GlobeState, { level: 'gallery' }>)
    : null

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onPointerDown={e => { if (!galleryOpen) setClickOrigin({ x: e.clientX, y: e.clientY }) }}
    >
      <div style={{ width: '100%', height: '100%', opacity: galleryOpen ? 0.4 : 1, transition: 'opacity 300ms' }}>
        <Canvas
          camera={{ position: [0, 0, 2.5], fov: 45 }}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={[palette.background]} />
          <ambientLight color="#ffffff" intensity={0.15} />
          <CameraLight />
          <CameraController
            flyTarget={flyTarget}
            targetDist={COUNTRY_FLY_DISTANCE}
            orbitRef={orbitRef}
            onComplete={handleFlyComplete}
          />
          <ZoomDetailController
            detailLevel={detailLevel}
            onDetailLevelChange={handleZoomDetailChange}
            disabled={flyTarget !== null}
          />
          <EarthMesh palette={palette} />
          <CountryLayer
            showSubdivisions={showSubdivisions}
            photoOpacity={countryPhotoOpacity}
            onHoverChange={setHoverInfo}
            onCountryTap={handleCountryTap}
            onCountryHover={handleCountryHover}
            palette={palette}
            countryHeroOverrides={countryHeroOverrides}
            countryHeroTransforms={countryHeroTransforms}
            profileIndex={profileIndex}
          />
          {shouldRenderSubdivisions && (
            <SubdivisionLayer
              opacity={subdivisionOpacity}
              onHoverChange={setHoverInfo}
              onSubdivisionTap={handleSubdivisionTap}
              palette={palette}
              heroOverrides={subdivisionHeroOverrides}
              heroTransforms={subdivisionHeroTransforms}
              profileIndex={profileIndex}
            />
          )}
          <OrbitControls
            ref={orbitRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={MIN_CAMERA_DISTANCE}
            maxDistance={MAX_CAMERA_DISTANCE}
            zoomSpeed={ZOOM_SPEED}
          />
        </Canvas>
      </div>

      {hoverInfo && !galleryOpen && (
        <FloatingCard
          info={hoverInfo}
          viewportWidth={viewportSize.width}
          viewportHeight={viewportSize.height}
        />
      )}

      {galleryOpen && (
        <div
          onClick={back}
          style={{ position: 'absolute', inset: 0, zIndex: 40, cursor: 'default' }}
          aria-label="Close gallery"
        />
      )}

      {galleryState && (
        <GalleryPanel
          key={galleryState.subdivisionId}
          subdivisionId={galleryState.subdivisionId}
          countryCode={galleryState.countryCode}
          onBack={back}
          initialHeroUrl={subdivisionHeroOverrides[galleryState.subdivisionId]}
          initialCountryHeroUrl={countryHeroOverrides[galleryState.countryCode] ?? seedCountryHeroes[galleryState.countryCode]}
          initialSubdivisionTransform={subdivisionHeroTransforms[galleryState.subdivisionId] ?? seedSubdivisionTransforms[galleryState.subdivisionId]}
          initialCountryTransform={countryHeroTransforms[galleryState.countryCode] ?? seedCountryTransforms[galleryState.countryCode]}
          onHeroChange={handleSubdivisionHeroChange}
          onCountryHeroChange={handleCountryHeroChange}
          onSubdivisionTransformChange={handleSubdivisionTransformChange}
          onCountryTransformChange={handleCountryTransformChange}
          clickOrigin={clickOrigin ?? undefined}
          profileIndex={profileIndex}
        />
      )}
    </div>
  )
}
