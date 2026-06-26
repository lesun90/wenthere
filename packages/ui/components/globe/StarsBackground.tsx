'use client'

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type {} from './r3f-jsx'

interface Props {
  count?: number
  color: string
  opacity: number
}

const RADIUS = 60
const DEPTH = 40
const ROTATE_SPEED = 0.01

function buildPositions(count: number) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const r = RADIUS + Math.random() * DEPTH
    const theta = Math.acos(1 - Math.random() * 2)
    const phi = Math.random() * Math.PI * 2
    positions[i * 3] = r * Math.sin(theta) * Math.cos(phi)
    positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi)
    positions[i * 3 + 2] = r * Math.cos(theta)
  }
  return positions
}

// Single Points draw call, well under the ~3000-particle mobile safety
// ceiling. Rotation is a per-frame group transform, not a buffer mutation,
// so it stays cheap even on low-end GPUs. Uses normal (non-additive)
// blending so stars stay visible against a light/white background too.
export function StarsBackground({ count = 2500, color, opacity }: Props) {
  const pointsRef = useRef<THREE.Points>(null)
  const positions = useMemo(() => buildPositions(count), [count])

  useFrame((_, delta) => {
    if (pointsRef.current) pointsRef.current.rotation.y += delta * ROTATE_SPEED
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.45}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </points>
  )
}
