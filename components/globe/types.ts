import type { Geometry } from 'geojson'  // still needed for HoverInfo

export interface HeroTransform {
  x: number     // horizontal offset as fraction of display width (0 = centered)
  y: number     // vertical offset as fraction of display height (0 = centered)
  scale: number // zoom multiplier (1.0 = default fill)
}

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
