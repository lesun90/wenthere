export interface HoverInfo {
  name: string
  heroPicUrl: string
  otherPicUrls: string[]
  placeCount: number
  screenX: number
  screenY: number
}

export type GlobeState =
  | { level: 'world' }
  | { level: 'subdivision'; countryCode: string; countryCenter: [number, number] }
  | { level: 'gallery'; countryCode: string; countryCenter: [number, number]; subdivisionId: string }
