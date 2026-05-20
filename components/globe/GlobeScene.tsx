'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { EarthMesh } from './EarthMesh'
import { CountryLayer } from './CountryLayer'
import type { HoverInfo } from './CountryLayer'
import { SubdivisionLayer } from './SubdivisionLayer'
import { DetailToggle } from './DetailToggle'

const MODE_TRANSITION_MS = 300
const MIN_CAMERA_DISTANCE = 1.2
const MAX_CAMERA_DISTANCE = 6
const ZOOM_SPEED = 0.65

function CameraLight() {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const offset = useMemo(() => new THREE.Vector3(2, 2, 4), [])
  const pos = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }) => {
    if (!lightRef.current) return
    pos.copy(offset).applyQuaternion(camera.quaternion).add(camera.position)
    lightRef.current.position.copy(pos)
  })

  return <directionalLight ref={lightRef} color="#ffffff" intensity={2.0} />
}

function useDetailProgress(detailLevel: 'country' | 'subdivision') {
  const [progress, setProgress] = useState(detailLevel === 'subdivision' ? 1 : 0)
  const progressRef = useRef(progress)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    const from = progressRef.current
    const to = detailLevel === 'subdivision' ? 1 : 0
    if (from === to) return

    let frame = 0
    const startedAt = performance.now()

    function tick(now: number) {
      const t = Math.min((now - startedAt) / MODE_TRANSITION_MS, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setProgress(from + (to - from) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [detailLevel])

  return progress
}

export function GlobeScene() {
  const [detailLevel, setDetailLevel] = useState<'country' | 'subdivision'>('country')
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const detailProgress = useDetailProgress(detailLevel)
  const countryPhotoOpacity = 1 - detailProgress
  const subdivisionOpacity = detailProgress
  const shouldRenderSubdivisions = detailLevel === 'subdivision' || subdivisionOpacity > 0

  useEffect(() => {
    setHoverInfo(null)
  }, [detailLevel])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#080c14']} />
        <ambientLight color="#ffffff" intensity={0.15} />
        <CameraLight />
        <EarthMesh />
        <CountryLayer
          detailLevel={detailLevel}
          photoOpacity={countryPhotoOpacity}
          onHoverChange={setHoverInfo}
        />
        {shouldRenderSubdivisions && (
          <SubdivisionLayer opacity={subdivisionOpacity} onHoverChange={setHoverInfo} />
        )}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={MIN_CAMERA_DISTANCE}
          maxDistance={MAX_CAMERA_DISTANCE}
          zoomSpeed={ZOOM_SPEED}
        />
      </Canvas>
      <DetailToggle detailLevel={detailLevel} onToggle={setDetailLevel} />
      {hoverInfo && (
        <div style={{
          position: 'absolute',
          bottom: 32,
          left: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(8, 12, 20, 0.85)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          padding: '10px 14px',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
          maxWidth: 280,
        }}>
          <img
            src={hoverInfo.heroPicUrl}
            alt={hoverInfo.name}
            style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
          />
          <span style={{ color: '#ffffff', fontSize: 14, fontWeight: 500, letterSpacing: 0.2 }}>
            {hoverInfo.name}
          </span>
        </div>
      )}
    </div>
  )
}
