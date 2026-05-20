import * as THREE from 'three'
import type { Feature, Position } from 'geojson'

type FlatPoint = [lng: number, lat: number]

const MAX_FILL_TRIANGLE_EDGE_DEGREES = 3

export function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const latRad = lat * (Math.PI / 180)
  const lngRad = lng * (Math.PI / 180)
  return new THREE.Vector3(
    radius * Math.cos(latRad) * Math.sin(lngRad),
    radius * Math.sin(latRad),
    radius * Math.cos(latRad) * Math.cos(lngRad),
  )
}

function centralAngleDegrees(a: FlatPoint, b: FlatPoint): number {
  const va = latLngToVec3(a[1], a[0], 1)
  const vb = latLngToVec3(b[1], b[0], 1)
  return THREE.MathUtils.radToDeg(va.angleTo(vb))
}

function midpoint(a: FlatPoint, b: FlatPoint): FlatPoint {
  let lngA = a[0]
  let lngB = b[0]

  if (Math.abs(lngA - lngB) > 180) {
    if (lngA < lngB) lngA += 360
    else lngB += 360
  }

  let lng = (lngA + lngB) / 2
  if (lng > 180) lng -= 360
  if (lng < -180) lng += 360

  return [lng, (a[1] + b[1]) / 2]
}

function pushProjectedTriangle(a: FlatPoint, b: FlatPoint, c: FlatPoint, radius: number, out: number[]) {
  const stack: Array<[FlatPoint, FlatPoint, FlatPoint]> = [[a, b, c]]

  while (stack.length > 0) {
    const [p1, p2, p3] = stack.pop()!
    const d12 = centralAngleDegrees(p1, p2)
    const d23 = centralAngleDegrees(p2, p3)
    const d31 = centralAngleDegrees(p3, p1)

    if (Math.max(d12, d23, d31) <= MAX_FILL_TRIANGLE_EDGE_DEGREES) {
      for (const [lng, lat] of [p1, p2, p3]) {
        const v = latLngToVec3(lat, lng, radius)
        out.push(v.x, v.y, v.z)
      }
      continue
    }

    if (d12 >= d23 && d12 >= d31) {
      const mid = midpoint(p1, p2)
      stack.push([p1, mid, p3], [mid, p2, p3])
    } else if (d23 >= d31) {
      const mid = midpoint(p2, p3)
      stack.push([p2, mid, p1], [mid, p3, p1])
    } else {
      const mid = midpoint(p3, p1)
      stack.push([p3, mid, p2], [mid, p1, p2])
    }
  }
}

function addRingToPositions(ring: Position[], radius: number, out: number[]) {
  if (ring.length < 3) return
  for (let i = 0; i < ring.length; i++) {
    const [lng1, lat1] = ring[i]
    const [lng2, lat2] = ring[(i + 1) % ring.length]
    const v1 = latLngToVec3(lat1, lng1, radius)
    const v2 = latLngToVec3(lat2, lng2, radius)
    out.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z)
  }
}

export function featureToLineGeometry(feature: Feature, radius: number): THREE.BufferGeometry {
  const positions: number[] = []
  const geom = feature.geometry
  if (!geom) return new THREE.BufferGeometry()

  if (geom.type === 'Polygon') {
    geom.coordinates.forEach(ring => addRingToPositions(ring, radius, positions))
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach(poly =>
      poly.forEach(ring => addRingToPositions(ring, radius, positions)),
    )
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geo
}

// Triangulate using flat lat/lng as 2D (proven reliable for 50m country shapes),
// then remap each 2D vertex to its 3D sphere position. Normals are set explicitly
// as the outward sphere direction per vertex — independent of triangle winding.
function addPolygonToPositions(rings: Position[][], radius: number, out: number[]) {
  const outerRing = rings[0]
  if (!outerRing || outerRing.length < 3) return

  const shape = new THREE.Shape()
  shape.moveTo(outerRing[0][0], outerRing[0][1])
  for (let i = 1; i < outerRing.length; i++) {
    shape.lineTo(outerRing[i][0], outerRing[i][1])
  }

  for (let r = 1; r < rings.length; r++) {
    const hole = rings[r]
    if (!hole || hole.length < 3) continue
    const path = new THREE.Path()
    path.moveTo(hole[0][0], hole[0][1])
    for (let i = 1; i < hole.length; i++) {
      path.lineTo(hole[i][0], hole[i][1])
    }
    shape.holes.push(path)
  }

  const shapeGeo = new THREE.ShapeGeometry(shape)
  const expanded = shapeGeo.index ? shapeGeo.toNonIndexed() : shapeGeo
  const pos2d = expanded.attributes.position

  for (let i = 0; i < pos2d.count; i += 3) {
    pushProjectedTriangle(
      [pos2d.getX(i), pos2d.getY(i)],
      [pos2d.getX(i + 1), pos2d.getY(i + 1)],
      [pos2d.getX(i + 2), pos2d.getY(i + 2)],
      radius,
      out,
    )
  }

  if (expanded !== shapeGeo) expanded.dispose()
  shapeGeo.dispose()
}

function featureBounds(feature: Feature) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity

  function processRings(rings: Position[][]) {
    for (const ring of rings) {
      for (const coord of ring) {
        const lng = coord[0], lat = coord[1]
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }

  const geom = feature.geometry
  if (geom?.type === 'Polygon') processRings(geom.coordinates)
  else if (geom?.type === 'MultiPolygon') geom.coordinates.forEach(p => processRings(p))

  return { minLng, maxLng, minLat, maxLat }
}

export function featureToFillGeometry(feature: Feature, radius: number): THREE.BufferGeometry {
  const positions: number[] = []
  const geom = feature.geometry
  if (!geom) return new THREE.BufferGeometry()

  if (geom.type === 'Polygon') {
    addPolygonToPositions(geom.coordinates, radius, positions)
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach(poly => addPolygonToPositions(poly, radius, positions))
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  // Outward sphere normal per vertex: normalized position vector.
  // This is correct regardless of triangle winding and gives proper Lambert shading.
  const normals: number[] = []
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2]
    const len = Math.sqrt(x * x + y * y + z * z)
    normals.push(x / len, y / len, z / len)
  }
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))

  // UV: invert each 3D position back to lat/lng, normalize within the feature's bounding box.
  // Gives the photo texture a consistent mapping across the polygon face.
  const { minLng, maxLng, minLat, maxLat } = featureBounds(feature)
  const lngRange = maxLng - minLng
  const latRange = maxLat - minLat
  const uvs: number[] = []
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2]
    const lat = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI)
    const lng = Math.atan2(x, z) * (180 / Math.PI)
    uvs.push(
      lngRange > 0 ? (lng - minLng) / lngRange : 0.5,
      latRange > 0 ? (lat - minLat) / latRange : 0.5,
    )
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))

  return geo
}
