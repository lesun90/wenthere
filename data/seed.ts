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

export interface TravelPhoto {
  id: string
  url: string
  caption: string
  takenAt?: string
  location: PhotoLocation
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

function photo(
  id: string,
  url: string,
  caption: string,
  countryCode: string,
  subdivisionCode: string,
): TravelPhoto {
  return {
    id,
    url,
    caption,
    location: {
      countryCode,
      subdivisionCode,
    },
  }
}

export const travelerProfile: TravelerProfile = {
  id: 'demo-traveler',
  name: 'Demo Traveler',
  photos: [
    photo('demo-usa-ca-1', '/demo/10.jpg', 'Golden Gate at dusk', 'USA', 'USA-3521'),
    photo('demo-usa-ca-2', '/demo/11.jpg', 'Big Sur coastline', 'USA', 'USA-3521'),
    photo('demo-usa-tx-1', '/demo/12.jpg', 'Big Bend canyon', 'USA', 'USA-3536'),
    photo('demo-usa-tx-2', '/demo/13.jpg', 'Hill Country wildflowers', 'USA', 'USA-3536'),
    photo('demo-usa-ny-1', '/demo/14.jpg', 'Manhattan skyline', 'USA', 'USA-3559'),
    photo('demo-usa-ny-2', '/demo/15.jpg', 'Central Park in fall', 'USA', 'USA-3559'),
    photo('demo-usa-il-1', '/demo/16.jpg', 'Chicago lakefront', 'USA', 'USA-3546'),
    photo('demo-usa-il-2', '/demo/17.jpg', 'The Bean at sunrise', 'USA', 'USA-3546'),
    photo('demo-usa-fl-1', '/demo/18.jpg', 'Everglades waterway', 'USA', 'USA-3542'),
    photo('demo-usa-fl-2', '/demo/19.jpg', 'Key West at sunset', 'USA', 'USA-3542'),
    photo('demo-chn-gd-1', '/demo/20.jpg', 'Pearl River delta', 'CHN', 'CHN-1180'),
    photo('demo-chn-gd-2', '/demo/21.jpg', 'Guangzhou skyline', 'CHN', 'CHN-1180'),
    photo('demo-chn-sc-1', '/demo/22.jpg', 'Jiuzhaigou valley', 'CHN', 'CHN-1809'),
    photo('demo-chn-sc-2', '/demo/23.jpg', 'Chengdu teahouse', 'CHN', 'CHN-1809'),
    photo('demo-chn-yn-1', '/demo/24.jpg', 'Tiger Leaping Gorge', 'CHN', 'CHN-1810'),
    photo('demo-chn-yn-2', '/demo/25.jpg', 'Rice terraces at Yuanyang', 'CHN', 'CHN-1810'),
    photo('demo-chn-bj-1', '/demo/26.jpg', 'Great Wall at Mutianyu', 'CHN', 'CHN-1155'),
    photo('demo-chn-bj-2', '/demo/27.jpg', 'Temple of Heaven courtyard', 'CHN', 'CHN-1155'),
    photo('demo-chn-xj-1', '/demo/28.jpg', 'Karakul Lake dunes', 'CHN', 'CHN-1756'),
    photo('demo-chn-xj-2', '/demo/29.jpg', 'Silk Road desert road', 'CHN', 'CHN-1756'),
    photo('demo-vnm-dn-1', '/demo/30.jpg', 'Dragon Bridge at night', 'VNM', 'VNM-491'),
    photo('demo-vnm-dn-2', '/demo/31.jpg', 'My Khe beach morning', 'VNM', 'VNM-491'),
    photo('demo-vnm-hn-1', '/demo/32.jpg', 'Hoan Kiem Lake', 'VNM', 'VNM-462'),
    photo('demo-vnm-hn-2', '/demo/33.jpg', 'Old Quarter at dusk', 'VNM', 'VNM-462'),
    photo('demo-vnm-hcm-1', '/demo/34.jpg', 'Ben Thanh market', 'VNM', 'VNM-501'),
    photo('demo-vnm-hcm-2', '/demo/35.jpg', 'Saigon River at night', 'VNM', 'VNM-501'),
  ],
  presentation: {
    countryHeroes: {
      USA: { photoId: 'demo-usa-ca-1' },
      CHN: { photoId: 'demo-chn-gd-1' },
      VNM: { photoId: 'demo-vnm-dn-1' },
    },
    subdivisionHeroes: {
      'USA-3521': { photoId: 'demo-usa-ca-1' },
      'USA-3536': { photoId: 'demo-usa-tx-1' },
      'USA-3559': { photoId: 'demo-usa-ny-1' },
      'USA-3546': { photoId: 'demo-usa-il-1' },
      'USA-3542': { photoId: 'demo-usa-fl-1' },
      'CHN-1180': { photoId: 'demo-chn-gd-1' },
      'CHN-1809': { photoId: 'demo-chn-sc-1' },
      'CHN-1810': { photoId: 'demo-chn-yn-1' },
      'CHN-1155': { photoId: 'demo-chn-bj-1' },
      'CHN-1756': { photoId: 'demo-chn-xj-1' },
      'VNM-491': { photoId: 'demo-vnm-dn-1' },
      'VNM-462': { photoId: 'demo-vnm-hn-1' },
      'VNM-501': { photoId: 'demo-vnm-hcm-1' },
    },
  },
}
