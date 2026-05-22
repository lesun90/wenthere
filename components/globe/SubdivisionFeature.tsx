import { memo, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { FALLBACK_COLOR, useSharedTexture } from './useSharedTexture'
import { isFrontHemisphereHit } from './pointerHit'
import type { GlobePalette, HeroTransform } from './types'

interface Props {
  fillGeometry: THREE.BufferGeometry
  lineGeometry: THREE.BufferGeometry
  isHovered: boolean
  opacityTarget: number
  heroPicUrl: string
  heroTransform?: HeroTransform
  palette: GlobePalette
  onHover: () => void
  onUnhover: () => void
  onClick: () => void
}

function isIdentityTransform(t: HeroTransform): boolean {
  return t.x === 0 && t.y === 0 && t.scale === 1
}

function sameHeroTransform(a?: HeroTransform, b?: HeroTransform) {
  if (a === b) return true
  if (!a || !b) return false
  return a.x === b.x && a.y === b.y && a.scale === b.scale
}

function SubdivisionFeatureComponent({
  fillGeometry,
  lineGeometry,
  isHovered,
  opacityTarget,
  heroPicUrl,
  heroTransform,
  palette,
  onHover,
  onUnhover,
  onClick,
}: Props) {
  const materialRef = useRef<THREE.MeshLambertMaterial>(null)
  const lineMaterialRef = useRef<THREE.LineBasicMaterial>(null)
  const animatedOpacityRef = useRef(opacityTarget)
  const cloneRef = useRef<THREE.Texture | null>(null)
  const prevSharedTextureRef = useRef<THREE.Texture | null>(null)

  const textureState = useSharedTexture(heroPicUrl)
  const sharedTexture = textureState.status === 'ready' ? textureState.texture : null
  const textureFailed = textureState.status === 'failed'

  // Clones share the source GPU texture while keeping independent UV transforms.
  useEffect(() => {
    if (!sharedTexture) return

    if (sharedTexture !== prevSharedTextureRef.current) {
      cloneRef.current?.dispose()
      cloneRef.current = null
      prevSharedTextureRef.current = sharedTexture
    }

    if (!heroTransform || isIdentityTransform(heroTransform)) {
      cloneRef.current?.dispose()
      cloneRef.current = null
      return
    }

    if (!cloneRef.current) {
      cloneRef.current = sharedTexture.clone()
    }

    const t = cloneRef.current
    const s = heroTransform.scale
    t.repeat.set(1 / s, 1 / s)
    // Solve for offset from u_center = 0.5 * repeat + offset.
    t.offset.x = 0.5 - (0.5 + heroTransform.x) / s
    t.offset.y = 0.5 - (0.5 - heroTransform.y) / s
  }, [sharedTexture, heroTransform])

  useEffect(() => {
    return () => { cloneRef.current?.dispose() }
  }, [])

  const needsTransform = !!(heroTransform && !isIdentityTransform(heroTransform))
  const effectiveTexture = needsTransform && cloneRef.current ? cloneRef.current : sharedTexture

  const borderColor = isHovered ? palette.subdivisionBorderHover : palette.subdivisionBorder
  const borderOpacity = (isHovered ? 0.95 : 0.4) * opacityTarget

  let fillColor: string
  let fillOpacity: number

  if (textureFailed) {
    fillColor = FALLBACK_COLOR
    fillOpacity = (isHovered ? 0.95 : 0.85) * opacityTarget
  } else if (effectiveTexture) {
    fillColor = '#ffffff'
    fillOpacity = (isHovered ? 0.95 : 0.85) * opacityTarget
  } else {
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
      materialRef.current.opacity = effectiveTexture || textureFailed
        ? (isHovered ? 0.95 : 0.85) * animatedOpacityRef.current
        : 0
    }
    if (lineMaterialRef.current) {
      lineMaterialRef.current.opacity = (isHovered ? 0.95 : 0.4) * animatedOpacityRef.current
    }
  })

  function handleHover(e: ThreeEvent<PointerEvent>) {
    if (!isFrontHemisphereHit(e.point, e.ray.origin)) return
    e.stopPropagation()
    onHover()
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (!isFrontHemisphereHit(e.point, e.ray.origin)) return
    e.stopPropagation()
    onClick()
  }

  return (
    <group>
      <mesh
        geometry={fillGeometry}
        renderOrder={3}
        onPointerOver={handleHover}
        onPointerOut={onUnhover}
        onClick={handleClick}
      >
        <meshLambertMaterial
          ref={materialRef}
          map={!textureFailed ? (effectiveTexture ?? null) : null}
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

export const SubdivisionFeature = memo(SubdivisionFeatureComponent, (prev, next) => (
  prev.fillGeometry === next.fillGeometry
  && prev.lineGeometry === next.lineGeometry
  && prev.isHovered === next.isHovered
  && prev.opacityTarget === next.opacityTarget
  && prev.heroPicUrl === next.heroPicUrl
  && sameHeroTransform(prev.heroTransform, next.heroTransform)
  && prev.palette === next.palette
))
