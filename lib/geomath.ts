import type { Feature } from 'geojson'

// Returns [lon, lat] centroid using the ring with the most coordinates as a
// proxy for the largest polygon in MultiPolygon features.
export function featureCentroid(feature: Feature): [number, number] {
  const { geometry } = feature
  if (!geometry) return [0, 0]

  let ring: number[][] = []

  if (geometry.type === 'Point') {
    return [geometry.coordinates[0], geometry.coordinates[1]]
  } else if (geometry.type === 'Polygon') {
    ring = geometry.coordinates[0] as number[][]
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      if (polygon[0].length > ring.length) ring = polygon[0] as number[][]
    }
  }

  if (ring.length === 0) return [0, 0]

  let lon = 0
  let lat = 0
  for (const coord of ring) {
    lon += coord[0]
    lat += coord[1]
  }
  return [lon / ring.length, lat / ring.length]
}
