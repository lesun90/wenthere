'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { EarthMesh } from './EarthMesh'
import { CountryLayer } from './CountryLayer'
import { SubdivisionLayer } from './SubdivisionLayer'
import { FloatingCard } from './FloatingCard'
import { GalleryPanel } from './GalleryPanel'
import type { HoverInfo, GlobeState } from './types'
import { latLngToVec3 } from '../../lib/geo'

const MODE_TRANSITION_MS = 300
const MIN_CAMERA_DISTANCE = 1.2
const MAX_CAMERA_DISTANCE = 6
const ZOOM_SPEED = 0.65
const FLY_DURATION = 600

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
  dist: number
  startedAt: number
}

function CameraController({
  flyTarget,
  orbitRef,
  onComplete,
}: {
  flyTarget: [number, number] | null
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
    jobRef.current = {
      startPos: camera.position.clone(),
      endDir,
      dist: camera.position.length(),
      startedAt: performance.now(),
    }
    if (orbitRef.current) orbitRef.current.enabled = false
  }, [flyTarget])

  useFrame(() => {
    const job = jobRef.current
    if (!job) return

    const t = Math.min((performance.now() - job.startedAt) / FLY_DURATION, 1)
    const eased = 1 - Math.pow(1 - t, 3)

    const dir = job.startPos.clone().normalize()
    dir.lerp(job.endDir, eased).normalize()
    camera.position.copy(dir.multiplyScalar(job.dist))
    camera.lookAt(0, 0, 0)

    if (t >= 1) {
      jobRef.current = null
      if (orbitRef.current) orbitRef.current.enabled = true
      onCompleteRef.current()
    }
  })

  return null
}

function useDetailProgress(show: boolean) {
  const [progress, setProgress] = useState(show ? 1 : 0)
  const progressRef = useRef(progress)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    const from = progressRef.current
    const to = show ? 1 : 0
    if (from === to) return

    let frame = 0
    const startedAt = performance.now()

    function tick(now: number) {
      const t = Math.min((now - startedAt) / MODE_TRANSITION_MS, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + (to - from) * eased
      setProgress(next)
      progressRef.current = next
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [show])

  return progress
}

export function GlobeScene() {
  const [navStack, setNavStack] = useState<GlobeState[]>([{ level: 'world' }])
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const pendingFlyRef = useRef<{ countryCode: string; center: [number, number] } | null>(null)
  const orbitRef = useRef<React.ElementRef<typeof OrbitControls>>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  const current = navStack[navStack.length - 1]
  const showSubdivisions = current.level === 'subdivision' || current.level === 'gallery'
  const galleryOpen = current.level === 'gallery'
  const gallerySubdivisionId = current.level === 'gallery' ? current.subdivisionId : null

  const detailProgress = useDetailProgress(showSubdivisions)
  const countryPhotoOpacity = 1 - detailProgress
  const subdivisionOpacity = detailProgress
  const shouldRenderSubdivisions = showSubdivisions || subdivisionOpacity > 0

  function push(state: GlobeState) {
    setNavStack(s => [...s, state])
  }

  function back() {
    setNavStack(s => s.length > 1 ? s.slice(0, -1) : s)
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

  function handleCountryTap(countryCode: string, centroid: [number, number]) {
    if (current.level !== 'world') return
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

  function handleSubdivisionTap(subdivisionId: string, _countryCode: string) {
    if (current.level === 'gallery') {
      setNavStack(s => [
        ...s.slice(0, -1),
        { ...(s[s.length - 1] as Extract<GlobeState, { level: 'gallery' }>), subdivisionId },
      ])
      return
    }
    if (current.level !== 'subdivision') return
    push({ level: 'gallery', countryCode: current.countryCode, countryCenter: current.countryCenter, subdivisionId })
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ width: '100%', height: '100%', opacity: galleryOpen ? 0.4 : 1, transition: 'opacity 300ms' }}>
        <Canvas
          camera={{ position: [0, 0, 2.5], fov: 45 }}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#080c14']} />
          <ambientLight color="#ffffff" intensity={0.15} />
          <CameraLight />
          <CameraController
            flyTarget={flyTarget}
            orbitRef={orbitRef}
            onComplete={handleFlyComplete}
          />
          <EarthMesh />
          <CountryLayer
            showSubdivisions={showSubdivisions}
            photoOpacity={countryPhotoOpacity}
            onHoverChange={setHoverInfo}
            onCountryTap={handleCountryTap}
          />
          {shouldRenderSubdivisions && (
            <SubdivisionLayer
              opacity={subdivisionOpacity}
              onHoverChange={setHoverInfo}
              onSubdivisionTap={handleSubdivisionTap}
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

      {gallerySubdivisionId && (
        <GalleryPanel
          key={gallerySubdivisionId}
          subdivisionId={gallerySubdivisionId}
          onBack={back}
        />
      )}
    </div>
  )
}
