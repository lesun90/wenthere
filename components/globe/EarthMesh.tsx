import * as THREE from 'three'

export function EarthMesh() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#B8C8D8" />
      </mesh>

      {/* Atmosphere glow: BackSide renders the inner face, creating a rim halo */}
      <mesh>
        <sphereGeometry args={[1.04, 64, 64]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
