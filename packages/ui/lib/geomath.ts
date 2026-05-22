import type { Feature, Geometry } from 'geojson'

export interface GeometryFrameBounds {
  x: number
  y: number
  width: number
  height: number
}

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

// Converts a GeoJSON Polygon or MultiPolygon geometry into an SVG path `d`
// string whose coordinates are normalised to fit within a frameW × frameH
// viewBox with uniform padding. Aspect ratio is preserved; the shape is
// centred. Y axis is flipped because SVG y goes down, latitude goes up.
// Returns '' for unsupported geometry types or degenerate bounding boxes.
export function geoJsonToSvgPath(
  geometry: Geometry | null,
  frameW: number,
  frameH: number,
  padding = 16,
): string {
  if (!geometry) return ''

  // Collect only exterior rings — holes are omitted intentionally; we want a
  // solid filled silhouette, not a cutout.
  const rings: number[][][] = []
  if (geometry.type === 'Polygon') {
    rings.push(geometry.coordinates[0] as number[][])
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      rings.push(polygon[0] as number[][])
    }
  }
  if (rings.length === 0) return ''

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const ring of rings) {
    for (const coord of ring) {
      if (coord[0] < minX) minX = coord[0]
      if (coord[0] > maxX) maxX = coord[0]
      if (coord[1] < minY) minY = coord[1]
      if (coord[1] > maxY) maxY = coord[1]
    }
  }

  const frame = geometryFrameBounds(geometry, frameW, frameH, padding)
  if (!frame) return ''

  let d = ''
  for (const ring of rings) {
    if (ring.length < 2) continue
    for (let i = 0; i < ring.length; i++) {
      const sx = (frame.x + ((ring[i][0] - minX) / (maxX - minX)) * frame.width).toFixed(1)
      const sy = (frame.y + ((maxY - ring[i][1]) / (maxY - minY)) * frame.height).toFixed(1)
      d += i === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`
    }
    d += ' Z'
  }

  return d
}

export function geometryFrameBounds(
  geometry: Geometry | null,
  frameW: number,
  frameH: number,
  padding = 16,
): GeometryFrameBounds | null {
  if (!geometry) return null

  const rings: number[][][] = []
  if (geometry.type === 'Polygon') {
    rings.push(geometry.coordinates[0] as number[][])
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      rings.push(polygon[0] as number[][])
    }
  }
  if (rings.length === 0) return null

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const ring of rings) {
    for (const coord of ring) {
      if (coord[0] < minX) minX = coord[0]
      if (coord[0] > maxX) maxX = coord[0]
      if (coord[1] < minY) minY = coord[1]
      if (coord[1] > maxY) maxY = coord[1]
    }
  }

  const geoW = maxX - minX
  const geoH = maxY - minY
  if (geoW === 0 || geoH === 0) return null

  const availW = frameW - padding * 2
  const availH = frameH - padding * 2
  const scale = Math.min(availW / geoW, availH / geoH)

  return {
    x: padding + (availW - geoW * scale) / 2,
    y: padding + (availH - geoH * scale) / 2,
    width: geoW * scale,
    height: geoH * scale,
  }
}
