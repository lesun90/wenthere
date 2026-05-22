import type {
  CountrySummary,
  PhotoFrameTransform,
  ProfileIndex,
  TravelPhoto,
  TravelerProfile,
  SubdivisionSummary,
} from '../data/seed'

const alpha3ToNumeric: Record<string, string> = {
  USA: '840',
  CHN: '156',
  VNM: '704',
}

function numericIdFor(photo: TravelPhoto): string {
  return photo.location.countryNumericId
    ?? alpha3ToNumeric[photo.location.countryCode]
    ?? photo.location.countryCode
}

function isPhotoInCountry(photo: TravelPhoto, countryCode: string): boolean {
  return photo.location.countryCode === countryCode
}

function isPhotoInSubdivision(photo: TravelPhoto, subdivisionCode: string): boolean {
  return photo.location.subdivisionCode === subdivisionCode
}

function selectHero(
  photos: TravelPhoto[],
  requestedPhotoId: string | undefined,
  belongsToPlace: (photo: TravelPhoto) => boolean,
): TravelPhoto | undefined {
  if (requestedPhotoId) {
    const requested = photos.find(photo => photo.id === requestedPhotoId)
    if (requested && belongsToPlace(requested)) return requested
  }

  return photos.find(belongsToPlace)
}

function heroTransform(
  hero: TravelPhoto | undefined,
  requestedPhotoId: string | undefined,
  framing: PhotoFrameTransform | undefined,
): PhotoFrameTransform | undefined {
  return hero && hero.id === requestedPhotoId ? framing : undefined
}

function emptyIndex(): ProfileIndex {
  return {
    countrySummariesByCode: {},
    countrySummariesByNumericId: {},
    subdivisionSummariesByCode: {},
    photosByCountryCode: {},
    photosBySubdivisionCode: {},
    renderableSubdivisionCodes: [],
    stats: {
      countryCount: 0,
      placeCount: 0,
      photoCount: 0,
    },
  }
}

export function buildProfileIndex(profile: TravelerProfile): ProfileIndex {
  const index = emptyIndex()
  const countryOrder: string[] = []
  const subdivisionOrder: string[] = []

  for (const photo of profile.photos) {
    const { countryCode, subdivisionCode } = photo.location
    if (!countryCode) continue

    if (!index.photosByCountryCode[countryCode]) {
      index.photosByCountryCode[countryCode] = []
      countryOrder.push(countryCode)
    }
    index.photosByCountryCode[countryCode].push(photo)

    if (subdivisionCode) {
      if (!index.photosBySubdivisionCode[subdivisionCode]) {
        index.photosBySubdivisionCode[subdivisionCode] = []
        subdivisionOrder.push(subdivisionCode)
      }
      index.photosBySubdivisionCode[subdivisionCode].push(photo)
    }
  }

  for (const countryCode of countryOrder) {
    const photos = index.photosByCountryCode[countryCode]
    const first = photos[0]
    const presentationHero = profile.presentation?.countryHeroes?.[countryCode]
    const hero = selectHero(
      photos,
      presentationHero?.photoId,
      photo => isPhotoInCountry(photo, countryCode),
    )

    if (!hero || !first) continue

    const subdivisionCodes = subdivisionOrder.filter(code =>
      index.photosBySubdivisionCode[code]?.some(photo => photo.location.countryCode === countryCode),
    )
    const renderablePlaceCount = subdivisionCodes.filter(code =>
      index.photosBySubdivisionCode[code]?.some(photo =>
        photo.location.countryCode === countryCode && photo.location.renderable !== false,
      ),
    ).length

    if (renderablePlaceCount === 0) continue

    const summary: CountrySummary = {
      countryCode,
      countryNumericId: numericIdFor(first),
      name: first.location.countryName,
      heroPic: hero.url,
      heroTransform: heroTransform(hero, presentationHero?.photoId, presentationHero?.framing),
      photos,
      subdivisionCodes,
      renderablePlaceCount,
      photoCount: photos.length,
    }

    index.countrySummariesByCode[countryCode] = summary
    index.countrySummariesByNumericId[summary.countryNumericId] = summary
  }

  for (const subdivisionCode of subdivisionOrder) {
    const photos = index.photosBySubdivisionCode[subdivisionCode]
    const first = photos[0]
    const presentationHero = profile.presentation?.subdivisionHeroes?.[subdivisionCode]
    const hero = selectHero(
      photos,
      presentationHero?.photoId,
      photo => isPhotoInSubdivision(photo, subdivisionCode),
    )

    if (!hero || !first) continue

    const summary: SubdivisionSummary = {
      subdivisionCode,
      countryCode: first.location.countryCode,
      name: first.location.subdivisionName ?? subdivisionCode,
      heroPic: hero.url,
      heroTransform: heroTransform(hero, presentationHero?.photoId, presentationHero?.framing),
      photos,
      renderable: photos.some(photo => photo.location.renderable !== false),
    }

    index.subdivisionSummariesByCode[subdivisionCode] = summary
    if (summary.renderable) index.renderableSubdivisionCodes.push(subdivisionCode)
  }

  index.stats.countryCount = Object.keys(index.countrySummariesByCode).length
  index.stats.placeCount = Object.keys(index.subdivisionSummariesByCode).length
  index.stats.photoCount = profile.photos.length

  return index
}

export function addPhoto(profile: TravelerProfile, photo: TravelPhoto): TravelerProfile {
  return {
    ...profile,
    photos: [...profile.photos, photo],
  }
}

export function removePhoto(profile: TravelerProfile, photoId: string): TravelerProfile {
  return {
    ...profile,
    photos: profile.photos.filter(photo => photo.id !== photoId),
  }
}

export function updatePhoto(
  profile: TravelerProfile,
  photoId: string,
  patch: Partial<Omit<TravelPhoto, 'id'>>,
): TravelerProfile {
  return {
    ...profile,
    photos: profile.photos.map(photo => (
      photo.id === photoId
        ? { ...photo, ...patch, location: patch.location ?? photo.location }
        : photo
    )),
  }
}

export function validateProfile(profile: TravelerProfile): string[] {
  const issues: string[] = []
  const seenPhotoIds = new Set<string>()
  const photosById = new Map<string, TravelPhoto>()

  for (const photo of profile.photos) {
    if (!photo.id) {
      issues.push(`Photo with URL "${photo.url}" is missing an id.`)
      continue
    }

    if (seenPhotoIds.has(photo.id)) {
      issues.push(`Duplicate photo id "${photo.id}".`)
    }
    seenPhotoIds.add(photo.id)
    photosById.set(photo.id, photo)

    if (!photo.location.countryCode) {
      issues.push(`Photo "${photo.id}" is missing location.countryCode.`)
    }
  }

  for (const [countryCode, placeHero] of Object.entries(profile.presentation?.countryHeroes ?? {})) {
    const photo = photosById.get(placeHero.photoId)
    if (!photo) {
      issues.push(`Country "${countryCode}" references missing hero photo "${placeHero.photoId}".`)
    } else if (photo.location.countryCode !== countryCode) {
      issues.push(`Country "${countryCode}" references photo "${placeHero.photoId}" outside the country.`)
    }
  }

  for (const [subdivisionCode, placeHero] of Object.entries(profile.presentation?.subdivisionHeroes ?? {})) {
    const photo = photosById.get(placeHero.photoId)
    if (!photo) {
      issues.push(`Subdivision "${subdivisionCode}" references missing hero photo "${placeHero.photoId}".`)
    } else if (photo.location.subdivisionCode !== subdivisionCode) {
      issues.push(`Subdivision "${subdivisionCode}" references photo "${placeHero.photoId}" outside the subdivision.`)
    }
  }

  return issues
}
