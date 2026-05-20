import { useMemo } from 'react'
import * as THREE from 'three'
import type { Feature } from 'geojson'
import { featureToLineGeometry, featureToFillGeometry } from '../../lib/geo'
import { FALLBACK_COLOR, useHeroTexture } from './useHeroTexture'

interface Props {
  feature: Feature
  isHovered: boolean
  opacity: number
  heroPicUrl: string
  onHover: () => void
  onUnhover: () => void
  onClick: () => void
}

export function SubdivisionFeature({ feature, isHovered, opacity, heroPicUrl, onHover, onUnhover, onClick }: Props) {
  const lineGeo = useMemo(() => featureToLineGeometry(feature, 1.004), [feature])
  const fillGeo = useMemo(() => featureToFillGeometry(feature, 1.003), [feature])

  const { texture, textureFailed } = useHeroTexture(heroPicUrl)

  const borderColor = isHovered ? '#ffffff' : '#c8d3e1'
  const borderOpacity = (isHovered ? 0.95 : 0.4) * opacity

  let fillColor: string
  let fillOpacity: number

  if (textureFailed) {
    fillColor = FALLBACK_COLOR
    fillOpacity = (isHovered ? 0.95 : 0.85) * opacity
  } else if (texture) {
    fillColor = '#ffffff'
    fillOpacity = (isHovered ? 0.95 : 0.85) * opacity
  } else {
    // loading
    fillColor = '#ffffff'
    fillOpacity = 0
  }

  return (
    <group>
      <mesh
        geometry={fillGeo}
        renderOrder={3}
        onPointerOver={(e) => { e.stopPropagation(); onHover() }}
        onPointerOut={onUnhover}
        onClick={(e) => { e.stopPropagation(); onClick() }}
      >
        <meshLambertMaterial
          map={!textureFailed ? (texture ?? null) : null}
          color={fillColor}
          transparent
          opacity={fillOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={lineGeo} renderOrder={4}>
        <lineBasicMaterial color={borderColor} transparent opacity={borderOpacity} depthWrite={false} />
      </lineSegments>
    </group>
  )
}
