'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PhotoFrameTransform, ProfileIndex, TravelerProfile, TravelPhoto } from '@beenthere/domain/lib/types'
import { buildProfileIndex, validateProfile } from '@beenthere/domain/lib/geodata'
import {
  appendLocalPhotos,
  applyPhotoEditDraft,
  removeStoredPhoto,
  setCountryFraming,
  setSubdivisionFraming,
  type PhotoEditDraftData,
} from '@beenthere/domain/lib/profile-store/mutations'
import type { ProfileStore } from '@beenthere/domain/lib/profile-store/types'

type StorageStatus = 'loading' | 'ready' | 'memory-fallback'

interface ProfileProviderValue {
  profile: TravelerProfile
  profileIndex: ProfileIndex
  unplacedPhotos: TravelPhoto[]
  loading: boolean
  storageStatus: StorageStatus
  errorMessage?: string
  pendingEditPhotoId: string | null
  clearPendingEditPhoto: () => void
  importPhotos: (files: File[]) => Promise<void>
  editPhoto: (photoId: string, draft: PhotoEditDraftData) => Promise<void>
  deletePhoto: (photoId: string) => Promise<void>
  setCountryHero: (countryCode: string, photoId: string, framing?: PhotoFrameTransform) => Promise<void>
  setSubdivisionHero: (subdivisionCode: string, photoId: string, framing?: PhotoFrameTransform) => Promise<void>
}

interface Props {
  seedProfile: TravelerProfile
  store?: ProfileStore | null
  children: (value: ProfileProviderValue) => ReactNode
}

function nextPhotoId(profileId: string): string {
  return `${profileId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function isPlaced(photo: TravelPhoto): boolean {
  return Boolean(photo.location.countryCode && photo.location.subdivisionCode)
}

export function ProfileProvider({ seedProfile, store = null, children }: Props) {
  const [profile, setProfile] = useState<TravelerProfile>(seedProfile)
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [pendingEditPhotoId, setPendingEditPhotoId] = useState<string | null>(null)
  const storeRef = useRef<ProfileStore | null>(store)

  const profileIndex = useMemo(() => buildProfileIndex(profile), [profile])
  const unplacedPhotos = useMemo(
    () => profile.photos.filter(photo => !isPlaced(photo)),
    [profile],
  )

  const persistProfile = useCallback(async (next: TravelerProfile) => {
    setProfile(next)
    if (storeRef.current) await storeRef.current.saveActiveProfile(next)
  }, [])

  useEffect(() => {
    storeRef.current = store
  }, [store])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!store) {
        setStorageStatus('memory-fallback')
        setProfile(seedProfile)
        return
      }
      try {
        const stored = await store.getActiveProfile()
        if (cancelled) return
        setProfile(stored ?? seedProfile)
        setStorageStatus('ready')
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Storage unavailable.')
        setStorageStatus('memory-fallback')
        setProfile(seedProfile)
      }
    }

    load()
    return () => { cancelled = true }
  }, [store, seedProfile])

  const importPhotos = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    let firstPhotoId: string | null = null
    const inputs = []
    for (const file of imageFiles) {
      const id = nextPhotoId(profile.id)
      // Hyphens keep the key safe as a URL path segment (/api/photo/<key>)
      const blobKey = `photo-${profile.id}-${id}`
      firstPhotoId ??= id
      if (storeRef.current) await storeRef.current.putPhotoBlob(blobKey, file)
      inputs.push({
        id,
        blobKey,
        objectUrl: `/api/photo/${blobKey}`,
        mimeType: file.type,
        fileName: file.name,
      })
    }

    await persistProfile(appendLocalPhotos(profile, inputs))
    setPendingEditPhotoId(firstPhotoId)
  }, [persistProfile, profile])

  const editPhoto = useCallback(async (photoId: string, draft: PhotoEditDraftData) => {
    const next = applyPhotoEditDraft(profile, photoId, draft)
    const issues = validateProfile(next)
    if (issues.length > 0) {
      setErrorMessage(issues[0])
      throw new Error(issues[0])
    }
    setErrorMessage(undefined)
    await persistProfile(next)
  }, [persistProfile, profile])

  const deletePhoto = useCallback(async (photoId: string) => {
    const photo = profile.photos.find(item => item.id === photoId)
    const next = removeStoredPhoto(profile, photoId)
    if (photo?.source?.kind === 'localBlob' && storeRef.current) {
      await storeRef.current.deletePhotoBlob(photo.source.key)
    }
    await persistProfile(next)
  }, [persistProfile, profile])

  const setCountryHero = useCallback(async (countryCode: string, photoId: string, framing: PhotoFrameTransform = { x: 0, y: 0, scale: 1 }) => {
    await persistProfile(setCountryFraming(profile, countryCode, photoId, framing))
  }, [persistProfile, profile])

  const setSubdivisionHero = useCallback(async (subdivisionCode: string, photoId: string, framing: PhotoFrameTransform = { x: 0, y: 0, scale: 1 }) => {
    await persistProfile(setSubdivisionFraming(profile, subdivisionCode, photoId, framing))
  }, [persistProfile, profile])

  const value: ProfileProviderValue = {
    profile,
    profileIndex,
    unplacedPhotos,
    loading: storageStatus === 'loading',
    storageStatus,
    errorMessage,
    pendingEditPhotoId,
    clearPendingEditPhoto: () => setPendingEditPhotoId(null),
    importPhotos,
    editPhoto,
    deletePhoto,
    setCountryHero,
    setSubdivisionHero,
  }

  return <>{children(value)}</>
}
