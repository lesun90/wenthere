import * as THREE from 'three'
import type { Feature, Geometry } from 'geojson'
import { featureToFillGeometry, featureToLineGeometry } from './geo'
import { featureCentroid, geoJsonToSvgPath } from './geomath'

export interface PreparedCountryRecord {
  feature: Feature
  id: string
  name: string
  centroid: [number, number]
  geometry: Geometry | null
  svgPath: string
  fillGeometry: THREE.BufferGeometry
  photoGeometry: THREE.BufferGeometry
  lineGeometry: THREE.BufferGeometry
}

export interface PreparedSubdivisionRecord {
  feature: Feature
  id: string
  name: string
  countryCode: string
  centroid: [number, number]
  geometry: Geometry | null
  svgPath: string
  fillGeometry: THREE.BufferGeometry
  lineGeometry: THREE.BufferGeometry
}

const geometryCache = new Map<string, THREE.BufferGeometry>()
const centroidCache = new Map<string, [number, number]>()
const svgPathCache = new Map<string, string>()

function geometryKey(layer: string, id: string, role: string, radius: number) {
  return `${layer}:${id}:${role}:${radius}`
}

function getFillGeometry(layer: string, id: string, role: string, radius: number, feature: Feature) {
  const key = geometryKey(layer, id, role, radius)
  let geometry = geometryCache.get(key)
  if (!geometry) {
    geometry = featureToFillGeometry(feature, radius)
    geometryCache.set(key, geometry)
  }
  return geometry
}

function getLineGeometry(layer: string, id: string, radius: number, feature: Feature) {
  const key = geometryKey(layer, id, 'line', radius)
  let geometry = geometryCache.get(key)
  if (!geometry) {
    geometry = featureToLineGeometry(feature, radius)
    geometryCache.set(key, geometry)
  }
  return geometry
}

function getCentroid(layer: string, id: string, feature: Feature): [number, number] {
  const key = `${layer}:${id}:centroid`
  let centroid = centroidCache.get(key)
  if (!centroid) {
    centroid = featureCentroid(feature)
    centroidCache.set(key, centroid)
  }
  return centroid
}

function getSvgPath(layer: string, id: string, geometry: Geometry | null) {
  const key = `${layer}:${id}:svgPath`
  let path = svgPathCache.get(key)
  if (path == null) {
    path = geoJsonToSvgPath(geometry, 200, 120)
    svgPathCache.set(key, path)
  }
  return path
}

export function prepareCountryRecords(features: Feature[]): PreparedCountryRecord[] {
  const seen = new Set<string>()
  const records: PreparedCountryRecord[] = []

  for (const feature of features) {
    const properties = feature.properties as Record<string, string> | null
    const id = feature.id != null ? String(feature.id) : properties?.name ?? ''
    if (!id || seen.has(id)) continue
    seen.add(id)

    const geometry = feature.geometry ?? null
    records.push({
      feature,
      id,
      name: properties?.name ?? '',
      centroid: getCentroid('country', id, feature),
      geometry,
      svgPath: getSvgPath('country', id, geometry),
      fillGeometry: getFillGeometry('country', id, 'fill', 1.001, feature),
      photoGeometry: getFillGeometry('country', id, 'photo', 1.0015, feature),
      lineGeometry: getLineGeometry('country', id, 1.002, feature),
    })
  }

  return records
}

export function prepareSubdivisionRecords(features: Feature[]): PreparedSubdivisionRecord[] {
  const records: PreparedSubdivisionRecord[] = []

  for (const feature of features) {
    const properties = feature.properties as Record<string, string> | null
    const id = String(properties?.adm1_code ?? '')
    if (!id) continue

    const geometry = feature.geometry ?? null
    records.push({
      feature,
      id,
      name: properties?.name ?? '',
      countryCode: properties?.adm0_a3 ?? '',
      centroid: getCentroid('subdivision', id, feature),
      geometry,
      svgPath: getSvgPath('subdivision', id, geometry),
      fillGeometry: getFillGeometry('subdivision', id, 'fill', 1.003, feature),
      lineGeometry: getLineGeometry('subdivision', id, 1.004, feature),
    })
  }

  return records
}
