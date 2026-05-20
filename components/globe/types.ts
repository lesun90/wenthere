import type { Geometry } from 'geojson'

export interface HoverInfo {
  name: string
  heroPicUrl: string
  otherPicUrls: string[]
  placeCount: number
  screenX: number
  screenY: number
  geometry: Geometry | null
}

export type GlobeState =
  | { level: 'world' }
  | { level: 'detail' }
  | { level: 'subdivision'; countryCode: string; countryCenter: [number, number] }
  | { level: 'gallery'; subdivisionId: string }
