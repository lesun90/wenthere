import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FALLBACK_COLOR, useSharedTexture } from './useSharedTexture'
import type { GlobePalette } from './types'

interface Props {
  fillGeometry: THREE.BufferGeometry
  lineGeometry: THREE.BufferGeometry
  isHovered: boolean
  opacityTarget: number
  heroPicUrl: string
  palette: GlobePalette
  onHover: () => void
  onUnhover: () => void
  onClick: () => void
}

export function SubdivisionFeature({
  fillGeometry,
  lineGeometry,
  isHovered,
  opacityTarget,
  heroPicUrl,
  palette,
  onHover,
  onUnhover,
  onClick,
}: Props) {
  const materialRef = useRef<THREE.MeshLambertMaterial>(null)
  const lineMaterialRef = useRef<THREE.LineBasicMaterial>(null)
  const animatedOpacityRef = useRef(opacityTarget)

  const textureState = useSharedTexture(heroPicUrl)
  const texture = textureState.status === 'ready' ? textureState.texture : null
  const textureFailed = textureState.status === 'failed'

  const borderColor = isHovered ? palette.subdivisionBorderHover : palette.subdivisionBorder
  const borderOpacity = (isHovered ? 0.95 : 0.4) * opacityTarget

  let fillColor: string
  let fillOpacity: number

  if (textureFailed) {
    fillColor = FALLBACK_COLOR
    fillOpacity = (isHovered ? 0.95 : 0.85) * opacityTarget
  } else if (texture) {
    fillColor = '#ffffff'
    fillOpacity = (isHovered ? 0.95 : 0.85) * opacityTarget
  } else {
    // loading
    fillColor = '#ffffff'
    fillOpacity = 0
  }

  useFrame((_, delta) => {
    animatedOpacityRef.current = THREE.MathUtils.damp(
      animatedOpacityRef.current,
      opacityTarget,
      12,
      delta,
    )

    if (materialRef.current) {
      materialRef.current.opacity = texture || textureFailed
        ? (isHovered ? 0.95 : 0.85) * animatedOpacityRef.current
        : 0
    }
    if (lineMaterialRef.current) {
      lineMaterialRef.current.opacity = (isHovered ? 0.95 : 0.4) * animatedOpacityRef.current
    }
  })

  return (
    <group>
      <mesh
        geometry={fillGeometry}
        renderOrder={3}
        onPointerOver={(e) => { e.stopPropagation(); onHover() }}
        onPointerOut={onUnhover}
        onClick={(e) => { e.stopPropagation(); onClick() }}
      >
        <meshLambertMaterial
          ref={materialRef}
          map={!textureFailed ? (texture ?? null) : null}
          color={fillColor}
          transparent
          opacity={fillOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={lineGeometry} renderOrder={4}>
        <lineBasicMaterial ref={lineMaterialRef} color={borderColor} transparent opacity={borderOpacity} depthWrite={false} />
      </lineSegments>
    </group>
  )
}
