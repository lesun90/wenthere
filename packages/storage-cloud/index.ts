import type {
  PhotoFrameTransform,
  ProfilePresentation,
  ProfileStore,
  TravelerProfile,
  TravelPhoto,
} from '@beenthere/ui'

export const ACTIVE_PHOTO_STATUSES = ['active'] as const

export const CLOUD_BETA_LIMITS = {
  maxOriginalBytes: 10 * 1024 * 1024,
  maxActivePhotos: 100,
  maxStoredBytes: 1024 * 1024 * 1024,
  storageAlertBytes: 500 * 1024 * 1024,
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const

export interface CloudProfileRow {
  id: string
  owner_id: string
  slug: string
  display_name: string
  public_visible: boolean
  suspended_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type CloudPhotoStatus = 'uploading' | 'active' | 'failed' | 'deleted'

export interface CloudPhotoRow {
  id: string
  profile_id: string
  original_r2_key: string
  display_r2_key: string | null
  thumb_r2_key: string | null
  caption: string
  taken_at: string | null
  country_code: string
  subdivision_code: string | null
  mime_type: string
  byte_size: number
  width: number | null
  height: number | null
  status: CloudPhotoStatus
  upload_completed_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface CloudPresentationRow {
  profile_id: string
  country_heroes: Record<string, unknown>
  subdivision_heroes: Record<string, unknown>
  updated_at?: string
}

export interface AssembleTravelerProfileInput {
  profile: CloudProfileRow
  photos: CloudPhotoRow[]
  presentation?: CloudPresentationRow | null
  imageUrlFor?: (photo: CloudPhotoRow) => string
}

export interface DecomposedTravelerProfile {
  profile: {
    id: string
    display_name: string
  }
  photos: Array<{
    id: string
    caption: string
    taken_at: string | null
    country_code: string
    subdivision_code: string | null
  }>
  presentation: {
    profile_id: string
    country_heroes: Record<string, unknown>
    subdivision_heroes: Record<string, unknown>
  }
}

export interface BetaInviteInput {
  userId: string
  adminCreatedUserIds: readonly string[]
}

const DEFAULT_IMAGE_URL_PREFIX = '/api/photos'

function isActivePhoto(photo: CloudPhotoRow): boolean {
  return photo.status === 'active' && photo.deleted_at === null
}

function objectKeyFor(photo: CloudPhotoRow): string {
  return photo.display_r2_key ?? photo.thumb_r2_key ?? photo.original_r2_key
}

function defaultImageUrlFor(photo: CloudPhotoRow): string {
  return `${DEFAULT_IMAGE_URL_PREFIX}/${encodeURIComponent(photo.id)}?variant=display`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeFraming(value: unknown): PhotoFrameTransform | undefined {
  if (!isRecord(value)) return undefined
  const { x, y, scale } = value
  if (typeof x !== 'number' || typeof y !== 'number' || typeof scale !== 'number') return undefined
  return { x, y, scale }
}

function normalizeHeroes(value: Record<string, unknown> | undefined): NonNullable<ProfilePresentation['countryHeroes']> {
  const heroes: NonNullable<ProfilePresentation['countryHeroes']> = {}
  for (const [placeCode, heroValue] of Object.entries(value ?? {})) {
    if (!isRecord(heroValue) || typeof heroValue.photoId !== 'string') continue
    const framing = normalizeFraming(heroValue.framing)
    heroes[placeCode] = {
      photoId: heroValue.photoId,
      ...(framing ? { framing } : {}),
    }
  }
  return heroes
}

function removeInvalidPresentation(profile: TravelerProfile): ProfilePresentation {
  const photosById = new Map(profile.photos.map(photo => [photo.id, photo]))
  const countryHeroes: NonNullable<ProfilePresentation['countryHeroes']> = {}
  const subdivisionHeroes: NonNullable<ProfilePresentation['subdivisionHeroes']> = {}

  for (const [countryCode, hero] of Object.entries(profile.presentation?.countryHeroes ?? {})) {
    const photo = photosById.get(hero.photoId)
    if (photo?.location.countryCode === countryCode) countryHeroes[countryCode] = hero
  }

  for (const [subdivisionCode, hero] of Object.entries(profile.presentation?.subdivisionHeroes ?? {})) {
    const photo = photosById.get(hero.photoId)
    if (photo?.location.subdivisionCode === subdivisionCode) subdivisionHeroes[subdivisionCode] = hero
  }

  return { countryHeroes, subdivisionHeroes }
}

export function assembleTravelerProfile(input: AssembleTravelerProfileInput): TravelerProfile {
  const imageUrlFor = input.imageUrlFor ?? defaultImageUrlFor
  const activePhotos = input.photos.filter(isActivePhoto)
  const profile: TravelerProfile = {
    id: input.profile.id,
    name: input.profile.display_name,
    photos: activePhotos.map((photo): TravelPhoto => ({
      id: photo.id,
      url: imageUrlFor(photo),
      caption: photo.caption,
      ...(photo.taken_at ? { takenAt: photo.taken_at } : {}),
      location: {
        countryCode: photo.country_code,
        ...(photo.subdivision_code ? { subdivisionCode: photo.subdivision_code } : {}),
      },
      source: {
        kind: 'cloudObject',
        key: objectKeyFor(photo),
        mimeType: photo.mime_type,
      },
    })),
    presentation: {
      countryHeroes: normalizeHeroes(input.presentation?.country_heroes),
      subdivisionHeroes: normalizeHeroes(input.presentation?.subdivision_heroes),
    },
  }

  return {
    ...profile,
    presentation: removeInvalidPresentation(profile),
  }
}

export function decomposeTravelerProfile(profile: TravelerProfile): DecomposedTravelerProfile {
  return {
    profile: {
      id: profile.id,
      display_name: profile.name,
    },
    photos: profile.photos.map(photo => ({
      id: photo.id,
      caption: photo.caption,
      taken_at: photo.takenAt ?? null,
      country_code: photo.location.countryCode,
      subdivision_code: photo.location.subdivisionCode ?? null,
    })),
    presentation: {
      profile_id: profile.id,
      country_heroes: profile.presentation?.countryHeroes ?? {},
      subdivision_heroes: profile.presentation?.subdivisionHeroes ?? {},
    },
  }
}

export function validateFraming(framing: PhotoFrameTransform): string[] {
  const issues: string[] = []
  if (framing.x < -1 || framing.x > 1) issues.push('framing.x must be between -1 and 1.')
  if (framing.y < -1 || framing.y > 1) issues.push('framing.y must be between -1 and 1.')
  if (framing.scale < 1 || framing.scale > 3) issues.push('framing.scale must be between 1 and 3.')
  return issues
}

export function validatePresentation(profile: TravelerProfile): string[] {
  const issues: string[] = []
  const photosById = new Map(profile.photos.map(photo => [photo.id, photo]))

  for (const [countryCode, hero] of Object.entries(profile.presentation?.countryHeroes ?? {})) {
    const photo = photosById.get(hero.photoId)
    if (!photo) {
      issues.push(`Country "${countryCode}" references missing hero photo "${hero.photoId}".`)
    } else if (photo.location.countryCode !== countryCode) {
      issues.push(`Country "${countryCode}" references photo "${hero.photoId}" outside the country.`)
    }
    if (hero.framing) issues.push(...validateFraming(hero.framing))
  }

  for (const [subdivisionCode, hero] of Object.entries(profile.presentation?.subdivisionHeroes ?? {})) {
    const photo = photosById.get(hero.photoId)
    if (!photo) {
      issues.push(`Subdivision "${subdivisionCode}" references missing hero photo "${hero.photoId}".`)
    } else if (photo.location.subdivisionCode !== subdivisionCode) {
      issues.push(`Subdivision "${subdivisionCode}" references photo "${hero.photoId}" outside the subdivision.`)
    }
    if (hero.framing) issues.push(...validateFraming(hero.framing))
  }

  return issues
}

export function cleanPresentationForDeletedPhoto(
  presentation: CloudPresentationRow,
  photoId: string,
): CloudPresentationRow {
  const countryHeroes = { ...presentation.country_heroes }
  const subdivisionHeroes = { ...presentation.subdivision_heroes }

  for (const [countryCode, hero] of Object.entries(countryHeroes)) {
    if (isRecord(hero) && hero.photoId === photoId) delete countryHeroes[countryCode]
  }
  for (const [subdivisionCode, hero] of Object.entries(subdivisionHeroes)) {
    if (isRecord(hero) && hero.photoId === photoId) delete subdivisionHeroes[subdivisionCode]
  }

  return {
    ...presentation,
    country_heroes: countryHeroes,
    subdivision_heroes: subdivisionHeroes,
  }
}

export function profileStorageUsage(photos: CloudPhotoRow[]): number {
  return photos.reduce((total, photo) => total + photo.byte_size, 0)
}

export function isBetaInviteAllowed(input: BetaInviteInput): boolean {
  return input.adminCreatedUserIds.includes(input.userId)
}

export class CloudProfileStore implements ProfileStore {
  constructor(private readonly profileUrl = '/api/profile') {}

  async getActiveProfile(): Promise<TravelerProfile | null> {
    const res = await fetch(this.profileUrl)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Failed to load cloud profile: ${res.status}`)
    return res.json()
  }

  async saveActiveProfile(profile: TravelerProfile): Promise<void> {
    const res = await fetch(this.profileUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decomposeTravelerProfile(profile)),
    })
    if (!res.ok) throw new Error(`Failed to save cloud profile: ${res.status}`)
  }

  async putPhotoBlob(key: string, file: File): Promise<void> {
    const form = new FormData()
    form.append('key', key)
    form.append('file', file)
    const res = await fetch('/api/photos', { method: 'POST', body: form })
    if (!res.ok) throw new Error(`Failed to upload cloud photo: ${res.status}`)
  }

  async deletePhotoBlob(key: string): Promise<void> {
    const res = await fetch(`/api/photos/${encodeURIComponent(key)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete cloud photo: ${res.status}`)
  }
}
