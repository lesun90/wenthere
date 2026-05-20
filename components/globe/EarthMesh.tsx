import * as THREE from 'three'
import type { GlobePalette } from './types'

interface Props {
  palette: GlobePalette
}

export function EarthMesh({ palette }: Props) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color={palette.earth} />
      </mesh>

      {/* Atmosphere glow: BackSide renders the inner face, creating a rim halo */}
      <mesh>
        <sphereGeometry args={[1.04, 64, 64]} />
        <meshStandardMaterial
          color={palette.atmosphereColor}
          transparent
          opacity={palette.atmosphereOpacity}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
