import type { Geometry } from 'geojson'
import type { PhotoFrameTransform } from '@beenthere/domain/lib/types'

export type HeroTransform = PhotoFrameTransform

export interface HoverInfo {
  name: string
  heroPicUrl: string
  heroTransform?: HeroTransform
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
  | { level: 'gallery'; subdivisionId: string; countryCode: string }

export interface GlobePalette {
  background: string
  earth: string
  atmosphereColor: string
  atmosphereOpacity: number
  countryFill: string
  countryFillHover: string
  countryBorder: string
  subdivisionBorder: string
  subdivisionBorderHover: string
}
