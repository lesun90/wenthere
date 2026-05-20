import { useMemo } from 'react'
import * as THREE from 'three'
import type { Feature } from 'geojson'
import { featureToLineGeometry, featureToFillGeometry } from '../../lib/geo'
import { FALLBACK_COLOR, useHeroTexture } from './useHeroTexture'

interface Props {
  feature: Feature
  isHovered: boolean
  dimmed: boolean
  photoOpacity: number
  heroPicUrl?: string
  onHover: () => void
  onUnhover: () => void
}

export function CountryFeature({
  feature,
  isHovered,
  dimmed,
  photoOpacity,
  heroPicUrl,
  onHover,
  onUnhover,
}: Props) {
  const lineGeo = useMemo(() => featureToLineGeometry(feature, 1.002), [feature])
  const fillGeo = useMemo(() => featureToFillGeometry(feature, 1.001), [feature])
  const photoGeo = useMemo(() => featureToFillGeometry(feature, 1.0015), [feature])

  const activeHeroPicUrl = photoOpacity > 0 ? heroPicUrl : undefined
  const { texture, textureFailed } = useHeroTexture(activeHeroPicUrl)

  const hasPhoto = !!activeHeroPicUrl
  const borderColor = '#ffffff'
  const borderOpacity = isHovered ? 0.95 : dimmed ? 0.85 : 0.7
  const borderRenderOrder = dimmed ? 6 : 2
  const baseFillColor = isHovered ? '#ffffff' : '#F0EAD6'
  const baseFillOpacity = isHovered ? 0.95 : 0.9

  let photoFillColor = '#ffffff'
  let photoFillOpacity = 0

  if (hasPhoto && textureFailed) {
    photoFillColor = FALLBACK_COLOR
    photoFillOpacity = (isHovered ? 0.95 : 0.85) * photoOpacity
  } else if (hasPhoto && texture) {
    photoFillColor = '#ffffff'
    photoFillOpacity = (isHovered ? 0.95 : 0.85) * photoOpacity
  }

  const showPhotoOverlay = hasPhoto && (textureFailed || texture)

  return (
    <group>
      <mesh
        geometry={fillGeo}
        renderOrder={1}
        onPointerOver={(e) => { e.stopPropagation(); onHover() }}
        onPointerOut={onUnhover}
      >
        <meshLambertMaterial
          color={baseFillColor}
          transparent
          opacity={baseFillOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {showPhotoOverlay && (
        <mesh
          geometry={photoGeo}
          renderOrder={2}
          onPointerOver={(e) => { e.stopPropagation(); onHover() }}
          onPointerOut={onUnhover}
        >
          <meshLambertMaterial
            map={!textureFailed ? (texture ?? null) : null}
            color={photoFillColor}
            transparent
            opacity={photoFillOpacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <lineSegments geometry={lineGeo} renderOrder={borderRenderOrder}>
        <lineBasicMaterial color={borderColor} transparent opacity={borderOpacity} depthWrite={false} />
      </lineSegments>
    </group>
  )
}
