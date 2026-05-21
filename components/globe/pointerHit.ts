import * as THREE from 'three'

const HORIZON_EPSILON = 0.01

export function isFrontHemisphereHit(point: THREE.Vector3, rayOrigin: THREE.Vector3): boolean {
  return point.clone().normalize().dot(rayOrigin.clone().normalize()) > HORIZON_EPSILON
}
