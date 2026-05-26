export interface PhotoFrameTransform {
  x: number
  y: number
  scale: number
  textureOffsetX?: number
  textureOffsetY?: number
  textureRepeatX?: number
  textureRepeatY?: number
}

export interface PhotoLocation {
  countryCode: string
  subdivisionCode?: string
  renderable?: boolean
}

export type PhotoSource =
  | { kind: 'asset' }
  | { kind: 'localBlob'; key: string; mimeType: string; fileName?: string }
  | { kind: 'cloudObject'; key: string; mimeType: string; fileName?: string }

export interface TravelPhoto {
  id: string
  url: string
  caption: string
  takenAt?: string
  location: PhotoLocation
  source?: PhotoSource
}

export interface PlaceHero {
  photoId: string
  framing?: PhotoFrameTransform
}

export interface ProfilePresentation {
  countryHeroes?: Record<string, PlaceHero>
  subdivisionHeroes?: Record<string, PlaceHero>
}

export interface TravelerProfile {
  id: string
  name: string
  photos: TravelPhoto[]
  presentation?: ProfilePresentation
}

export interface CountrySummary {
  countryCode: string
  countryNumericId: string
  name: string
  heroPic: string
  heroTransform?: PhotoFrameTransform
  photos: TravelPhoto[]
  subdivisionCodes: string[]
  renderablePlaceCount: number
  photoCount: number
}

export interface SubdivisionSummary {
  subdivisionCode: string
  countryCode: string
  name: string
  heroPic: string
  heroTransform?: PhotoFrameTransform
  photos: TravelPhoto[]
  renderable: boolean
}

export interface ProfileIndex {
  countrySummariesByCode: Record<string, CountrySummary>
  countrySummariesByNumericId: Record<string, CountrySummary>
  subdivisionSummariesByCode: Record<string, SubdivisionSummary>
  photosByCountryCode: Record<string, TravelPhoto[]>
  photosBySubdivisionCode: Record<string, TravelPhoto[]>
  renderableSubdivisionCodes: string[]
  stats: {
    countryCount: number
    placeCount: number
    photoCount: number
  }
}
