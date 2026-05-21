export interface Photo {
  url: string
  caption: string
}

export interface SubdivisionMemory {
  subdivisionCode: string // adm1_code from Natural Earth GeoJSON
  name: string
  heroPic: string // URL — references one photo in photos[]
  photos: Photo[] // all photos for this subdivision (includes hero)
}

export interface CountryMemory {
  countryCode: string // ISO 3166-1 alpha-3 (e.g. "USA", "CHN", "VNM")
  countryNumericId?: string // TopoJSON country feature id when countryCode is not enough
  name: string
  heroPic: string // URL — references one photo in photos[] (reuses first subdivision hero)
  photos: Photo[] // country-level photos; empty in demo, populated from subdivision gallery in M3
  subdivisions: SubdivisionMemory[]
}

export interface TravelerProfile {
  name: string
  countries: CountryMemory[]
}

export const travelerProfile: TravelerProfile = {
  name: 'Demo Traveler',
  countries: [
    {
      countryCode: 'USA',
      name: 'United States',
      heroPic: '/demo/10.jpg',
      photos: [],
      subdivisions: [
        {
          subdivisionCode: 'USA-3521',
          name: 'California',
          heroPic: '/demo/10.jpg',
          photos: [
            { url: '/demo/10.jpg', caption: 'Golden Gate at dusk' },
            { url: '/demo/11.jpg', caption: 'Big Sur coastline' },
          ],
        },
        {
          subdivisionCode: 'USA-3536',
          name: 'Texas',
          heroPic: '/demo/12.jpg',
          photos: [
            { url: '/demo/12.jpg', caption: 'Big Bend canyon' },
            { url: '/demo/13.jpg', caption: 'Hill Country wildflowers' },
          ],
        },
        {
          subdivisionCode: 'USA-3559',
          name: 'New York',
          heroPic: '/demo/14.jpg',
          photos: [
            { url: '/demo/14.jpg', caption: 'Manhattan skyline' },
            { url: '/demo/15.jpg', caption: 'Central Park in fall' },
          ],
        },
        {
          subdivisionCode: 'USA-3546',
          name: 'Illinois',
          heroPic: '/demo/16.jpg',
          photos: [
            { url: '/demo/16.jpg', caption: 'Chicago lakefront' },
            { url: '/demo/17.jpg', caption: 'The Bean at sunrise' },
          ],
        },
        {
          subdivisionCode: 'USA-3542',
          name: 'Florida',
          heroPic: '/demo/18.jpg',
          photos: [
            { url: '/demo/18.jpg', caption: 'Everglades waterway' },
            { url: '/demo/19.jpg', caption: 'Key West at sunset' },
          ],
        },
      ],
    },
    {
      countryCode: 'CHN',
      name: 'China',
      heroPic: '/demo/20.jpg',
      photos: [],
      subdivisions: [
        {
          subdivisionCode: 'CHN-1180',
          name: 'Guangdong',
          heroPic: '/demo/20.jpg',
          photos: [
            { url: '/demo/20.jpg', caption: 'Pearl River delta' },
            { url: '/demo/21.jpg', caption: 'Guangzhou skyline' },
          ],
        },
        {
          subdivisionCode: 'CHN-1809',
          name: 'Sichuan',
          heroPic: '/demo/22.jpg',
          photos: [
            { url: '/demo/22.jpg', caption: 'Jiuzhaigou valley' },
            { url: '/demo/23.jpg', caption: 'Chengdu teahouse' },
          ],
        },
        {
          subdivisionCode: 'CHN-1810',
          name: 'Yunnan',
          heroPic: '/demo/24.jpg',
          photos: [
            { url: '/demo/24.jpg', caption: 'Tiger Leaping Gorge' },
            { url: '/demo/25.jpg', caption: 'Rice terraces at Yuanyang' },
          ],
        },
        {
          subdivisionCode: 'CHN-1155',
          name: 'Beijing',
          heroPic: '/demo/26.jpg',
          photos: [
            { url: '/demo/26.jpg', caption: 'Great Wall at Mutianyu' },
            { url: '/demo/27.jpg', caption: 'Temple of Heaven courtyard' },
          ],
        },
        {
          subdivisionCode: 'CHN-1756',
          name: 'Xinjiang',
          heroPic: '/demo/28.jpg',
          photos: [
            { url: '/demo/28.jpg', caption: 'Karakul Lake dunes' },
            { url: '/demo/29.jpg', caption: 'Silk Road desert road' },
          ],
        },
      ],
    },
    {
      countryCode: 'VNM',
      name: 'Vietnam',
      heroPic: '/demo/30.jpg',
      photos: [],
      subdivisions: [
        {
          subdivisionCode: 'VNM-491',
          name: 'Đà Nẵng',
          heroPic: '/demo/30.jpg',
          photos: [
            { url: '/demo/30.jpg', caption: 'Dragon Bridge at night' },
            { url: '/demo/31.jpg', caption: 'My Khe beach morning' },
          ],
        },
        {
          subdivisionCode: 'VNM-462',
          name: 'Ha Noi',
          heroPic: '/demo/32.jpg',
          photos: [
            { url: '/demo/32.jpg', caption: 'Hoan Kiem Lake' },
            { url: '/demo/33.jpg', caption: 'Old Quarter at dusk' },
          ],
        },
        {
          subdivisionCode: 'VNM-501',
          name: 'Hồ Chí Minh',
          heroPic: '/demo/34.jpg',
          photos: [
            { url: '/demo/34.jpg', caption: 'Bến Thành market' },
            { url: '/demo/35.jpg', caption: 'Saigon River at night' },
          ],
        },
      ],
    },
  ],
}
