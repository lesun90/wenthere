export interface PhotoFrameTransform {
  x: number
  y: number
  scale: number
}

export interface PhotoLocation {
  countryCode: string
  countryName: string
  countryNumericId?: string
  subdivisionCode?: string
  subdivisionName?: string
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
  countryName: string,
  countryNumericId: string,
  subdivisionCode: string,
  subdivisionName: string,
): TravelPhoto {
  return {
    id,
    url,
    caption,
    location: {
      countryCode,
      countryName,
      countryNumericId,
      subdivisionCode,
      subdivisionName,
    },
  }
}

export const travelerProfile: TravelerProfile = {
  id: 'demo-traveler',
  name: 'Demo Traveler',
  photos: [
    photo('demo-usa-ca-1', '/demo/10.jpg', 'Golden Gate at dusk', 'USA', 'United States', '840', 'USA-3521', 'California'),
    photo('demo-usa-ca-2', '/demo/11.jpg', 'Big Sur coastline', 'USA', 'United States', '840', 'USA-3521', 'California'),
    photo('demo-usa-tx-1', '/demo/12.jpg', 'Big Bend canyon', 'USA', 'United States', '840', 'USA-3536', 'Texas'),
    photo('demo-usa-tx-2', '/demo/13.jpg', 'Hill Country wildflowers', 'USA', 'United States', '840', 'USA-3536', 'Texas'),
    photo('demo-usa-ny-1', '/demo/14.jpg', 'Manhattan skyline', 'USA', 'United States', '840', 'USA-3559', 'New York'),
    photo('demo-usa-ny-2', '/demo/15.jpg', 'Central Park in fall', 'USA', 'United States', '840', 'USA-3559', 'New York'),
    photo('demo-usa-il-1', '/demo/16.jpg', 'Chicago lakefront', 'USA', 'United States', '840', 'USA-3546', 'Illinois'),
    photo('demo-usa-il-2', '/demo/17.jpg', 'The Bean at sunrise', 'USA', 'United States', '840', 'USA-3546', 'Illinois'),
    photo('demo-usa-fl-1', '/demo/18.jpg', 'Everglades waterway', 'USA', 'United States', '840', 'USA-3542', 'Florida'),
    photo('demo-usa-fl-2', '/demo/19.jpg', 'Key West at sunset', 'USA', 'United States', '840', 'USA-3542', 'Florida'),
    photo('demo-chn-gd-1', '/demo/20.jpg', 'Pearl River delta', 'CHN', 'China', '156', 'CHN-1180', 'Guangdong'),
    photo('demo-chn-gd-2', '/demo/21.jpg', 'Guangzhou skyline', 'CHN', 'China', '156', 'CHN-1180', 'Guangdong'),
    photo('demo-chn-sc-1', '/demo/22.jpg', 'Jiuzhaigou valley', 'CHN', 'China', '156', 'CHN-1809', 'Sichuan'),
    photo('demo-chn-sc-2', '/demo/23.jpg', 'Chengdu teahouse', 'CHN', 'China', '156', 'CHN-1809', 'Sichuan'),
    photo('demo-chn-yn-1', '/demo/24.jpg', 'Tiger Leaping Gorge', 'CHN', 'China', '156', 'CHN-1810', 'Yunnan'),
    photo('demo-chn-yn-2', '/demo/25.jpg', 'Rice terraces at Yuanyang', 'CHN', 'China', '156', 'CHN-1810', 'Yunnan'),
    photo('demo-chn-bj-1', '/demo/26.jpg', 'Great Wall at Mutianyu', 'CHN', 'China', '156', 'CHN-1155', 'Beijing'),
    photo('demo-chn-bj-2', '/demo/27.jpg', 'Temple of Heaven courtyard', 'CHN', 'China', '156', 'CHN-1155', 'Beijing'),
    photo('demo-chn-xj-1', '/demo/28.jpg', 'Karakul Lake dunes', 'CHN', 'China', '156', 'CHN-1756', 'Xinjiang'),
    photo('demo-chn-xj-2', '/demo/29.jpg', 'Silk Road desert road', 'CHN', 'China', '156', 'CHN-1756', 'Xinjiang'),
    photo('demo-vnm-dn-1', '/demo/30.jpg', 'Dragon Bridge at night', 'VNM', 'Vietnam', '704', 'VNM-491', 'Da Nang'),
    photo('demo-vnm-dn-2', '/demo/31.jpg', 'My Khe beach morning', 'VNM', 'Vietnam', '704', 'VNM-491', 'Da Nang'),
    photo('demo-vnm-hn-1', '/demo/32.jpg', 'Hoan Kiem Lake', 'VNM', 'Vietnam', '704', 'VNM-462', 'Ha Noi'),
    photo('demo-vnm-hn-2', '/demo/33.jpg', 'Old Quarter at dusk', 'VNM', 'Vietnam', '704', 'VNM-462', 'Ha Noi'),
    photo('demo-vnm-hcm-1', '/demo/34.jpg', 'Ben Thanh market', 'VNM', 'Vietnam', '704', 'VNM-501', 'Ho Chi Minh'),
    photo('demo-vnm-hcm-2', '/demo/35.jpg', 'Saigon River at night', 'VNM', 'Vietnam', '704', 'VNM-501', 'Ho Chi Minh'),
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
