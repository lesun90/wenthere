import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { FALLBACK_COLOR, useSharedTexture } from './useSharedTexture'
import { isFrontHemisphereHit } from './pointerHit'
import type { GlobePalette } from './types'

interface Props {
  fillGeometry: THREE.BufferGeometry
  photoGeometry: THREE.BufferGeometry
  lineGeometry: THREE.BufferGeometry
  isHovered: boolean
  dimmed: boolean
  interactive: boolean
  photoOpacityTarget: number
  heroPicUrl?: string
  palette: GlobePalette
  onHover: () => void
  onUnhover: () => void
  onClick: () => void
}

export function CountryFeature({
  fillGeometry,
  photoGeometry,
  lineGeometry,
  isHovered,
  dimmed,
  interactive,
  photoOpacityTarget,
  heroPicUrl,
  palette,
  onHover,
  onUnhover,
  onClick,
}: Props) {
  const baseMaterialRef = useRef<THREE.MeshLambertMaterial>(null)
  const photoMaterialRef = useRef<THREE.MeshLambertMaterial>(null)
  const lineMaterialRef = useRef<THREE.LineBasicMaterial>(null)
  const animatedPhotoOpacityRef = useRef(photoOpacityTarget)

  const textureState = useSharedTexture(heroPicUrl)
  const texture = textureState.status === 'ready' ? textureState.texture : null
  const textureFailed = textureState.status === 'failed'

  const hasPhoto = !!heroPicUrl
  const borderColor = palette.countryBorder
  const borderOpacity = isHovered ? 0.95 : dimmed ? 0.85 : 0.7
  const borderRenderOrder = dimmed ? 6 : 2
  const baseFillColor = isHovered ? palette.countryFillHover : palette.countryFill
  const baseFillOpacity = isHovered ? 0.95 : 0.9

  let photoFillColor = '#ffffff'
  let photoFillOpacity = 0

  if (hasPhoto && textureFailed) {
    photoFillColor = FALLBACK_COLOR
    photoFillOpacity = (isHovered ? 0.95 : 0.85) * photoOpacityTarget
  } else if (hasPhoto && texture) {
    photoFillColor = '#ffffff'
    photoFillOpacity = (isHovered ? 0.95 : 0.85) * photoOpacityTarget
  }

  const showPhotoOverlay = hasPhoto && (textureFailed || texture)

  function handleHover(e: ThreeEvent<PointerEvent>) {
    if (!interactive) return
    if (!isFrontHemisphereHit(e.point, e.ray.origin)) return
    e.stopPropagation()
    onHover()
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (!interactive) return
    if (!isFrontHemisphereHit(e.point, e.ray.origin)) return
    e.stopPropagation()
    onClick()
  }

  useFrame((_, delta) => {
    animatedPhotoOpacityRef.current = THREE.MathUtils.damp(
      animatedPhotoOpacityRef.current,
      photoOpacityTarget,
      12,
      delta,
    )

    if (baseMaterialRef.current) {
      baseMaterialRef.current.color.set(baseFillColor)
      baseMaterialRef.current.opacity = baseFillOpacity
    }
    if (lineMaterialRef.current) {
      lineMaterialRef.current.opacity = borderOpacity
    }
    if (photoMaterialRef.current) {
      photoMaterialRef.current.opacity = (isHovered ? 0.95 : 0.85) * animatedPhotoOpacityRef.current
    }
  })

  return (
    <group>
      <mesh
        geometry={fillGeometry}
        renderOrder={1}
        onPointerOver={handleHover}
        onPointerOut={interactive ? onUnhover : undefined}
        onClick={handleClick}
      >
        <meshLambertMaterial
          ref={baseMaterialRef}
          color={baseFillColor}
          transparent
          opacity={baseFillOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {showPhotoOverlay && (
        <mesh
          geometry={photoGeometry}
          renderOrder={2}
          onPointerOver={handleHover}
          onPointerOut={interactive ? onUnhover : undefined}
          onClick={handleClick}
        >
          <meshLambertMaterial
            ref={photoMaterialRef}
            map={!textureFailed ? (texture ?? null) : null}
            color={photoFillColor}
            transparent
            opacity={photoFillOpacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <lineSegments geometry={lineGeometry} renderOrder={borderRenderOrder}>
        <lineBasicMaterial ref={lineMaterialRef} color={borderColor} transparent opacity={borderOpacity} depthWrite={false} />
      </lineSegments>
    </group>
  )
}
