import type { PhotoFrameTransform, TravelerProfile, TravelPhoto } from '../types'
import {
  findCountryCodeByName,
  findSubdivisionCodeByName,
} from '../geo-metadata'

export interface LocalPhotoInput {
  id: string
  blobKey: string
  objectUrl: string
  mimeType: string
  fileName?: string
}

export interface PhotoEditDraftData {
  caption: string
  takenAt: string
  countryName: string
  subdivisionName: string
}

function captionFromFileName(fileName: string | undefined): string {
  if (!fileName) return 'Untitled memory'
  return fileName.replace(/\.[^.]+$/, '').trim() || 'Untitled memory'
}

function ensurePresentation(profile: TravelerProfile): NonNullable<TravelerProfile['presentation']> {
  return {
    countryHeroes: { ...(profile.presentation?.countryHeroes ?? {}) },
    subdivisionHeroes: { ...(profile.presentation?.subdivisionHeroes ?? {}) },
  }
}

function samePhoto(photo: TravelPhoto, photoId: string): boolean {
  return photo.id === photoId
}

function withSinglePhotoCountryHero(profile: TravelerProfile, countryCode: string): TravelerProfile {
  if (!countryCode) return profile

  const countryPhotos = profile.photos.filter(photo => photo.location.countryCode === countryCode)
  if (countryPhotos.length !== 1) return profile

  const [photo] = countryPhotos
  if (profile.presentation?.countryHeroes?.[countryCode]?.photoId === photo.id) return profile

  const presentation = ensurePresentation(profile)
  presentation.countryHeroes = {
    ...(presentation.countryHeroes ?? {}),
    [countryCode]: { photoId: photo.id },
  }

  return { ...profile, presentation }
}

export function appendLocalPhotos(profile: TravelerProfile, photos: LocalPhotoInput[]): TravelerProfile {
  return {
    ...profile,
    photos: [
      ...profile.photos,
      ...photos.map((photo): TravelPhoto => ({
        id: photo.id,
        url: photo.objectUrl,
        caption: captionFromFileName(photo.fileName),
        location: { countryCode: '' },
        source: {
          kind: 'localBlob',
          key: photo.blobKey,
          mimeType: photo.mimeType,
          ...(photo.fileName ? { fileName: photo.fileName } : {}),
        },
      })),
    ],
  }
}

export function applyPhotoEditDraft(
  profile: TravelerProfile,
  photoId: string,
  draft: PhotoEditDraftData,
): TravelerProfile {
  const countryCode = findCountryCodeByName(draft.countryName) ?? draft.countryName.trim()
  const subdivisionCode = findSubdivisionCodeByName(draft.subdivisionName, countryCode) ?? draft.subdivisionName.trim()

  const next = {
    ...profile,
    photos: profile.photos.map(photo => {
      if (!samePhoto(photo, photoId)) return photo
      return {
        ...photo,
        caption: draft.caption,
        ...(draft.takenAt ? { takenAt: draft.takenAt } : { takenAt: undefined }),
        location: {
          countryCode,
          ...(subdivisionCode ? { subdivisionCode } : {}),
        },
      }
    }),
  }

  return withSinglePhotoCountryHero(next, countryCode)
}

export function removeStoredPhoto(profile: TravelerProfile, photoId: string): TravelerProfile {
  const presentation = ensurePresentation(profile)

  for (const [countryCode, hero] of Object.entries(presentation.countryHeroes ?? {})) {
    if (hero.photoId === photoId) delete presentation.countryHeroes?.[countryCode]
  }
  for (const [subdivisionCode, hero] of Object.entries(presentation.subdivisionHeroes ?? {})) {
    if (hero.photoId === photoId) delete presentation.subdivisionHeroes?.[subdivisionCode]
  }

  return {
    ...profile,
    photos: profile.photos.filter(photo => !samePhoto(photo, photoId)),
    presentation,
  }
}

export function setCountryFraming(
  profile: TravelerProfile,
  countryCode: string,
  photoId: string,
  framing: PhotoFrameTransform,
): TravelerProfile {
  const presentation = ensurePresentation(profile)
  presentation.countryHeroes = {
    ...(presentation.countryHeroes ?? {}),
    [countryCode]: { photoId, framing },
  }
  return { ...profile, presentation }
}

export function setSubdivisionFraming(
  profile: TravelerProfile,
  subdivisionCode: string,
  photoId: string,
  framing: PhotoFrameTransform,
): TravelerProfile {
  const presentation = ensurePresentation(profile)
  presentation.subdivisionHeroes = {
    ...(presentation.subdivisionHeroes ?? {}),
    [subdivisionCode]: { photoId, framing },
  }
  return { ...profile, presentation }
}
