import * as THREE from 'three'

export function EarthMesh() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#0A1628" />
      </mesh>

      {/* Atmosphere glow: BackSide renders the inner face, creating a rim halo */}
      <mesh>
        <sphereGeometry args={[1.04, 64, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
