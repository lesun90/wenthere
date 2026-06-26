'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PhotoFrameTransform, ProfileIndex, TravelerProfile, TravelPhoto } from '../../lib/types'
import { buildProfileIndex, validateProfile } from '../../lib/geodata'
import {
  appendLocalPhotos,
  applyPhotoEditDraft,
  removeStoredPhoto,
  setCountryFraming,
  setSubdivisionFraming,
  type PhotoEditDraftData,
} from '../../lib/profile-store/mutations'
import type { ProfileStore } from '../../lib/profile-store/types'

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
  importPhotos: (files: File[], defaultCountryCode?: string) => Promise<void>
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
  const profileRef = useRef<TravelerProfile>(seedProfile)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())

  const profileIndex = useMemo(() => buildProfileIndex(profile), [profile])
  const unplacedPhotos = useMemo(
    () => profile.photos.filter(photo => !isPlaced(photo)),
    [profile],
  )

  const setActiveProfile = useCallback((next: TravelerProfile) => {
    profileRef.current = next
    setProfile(next)
  }, [])

  const persistProfile = useCallback(async (next: TravelerProfile) => {
    setActiveProfile(next)
    const currentStore = storeRef.current
    if (!currentStore) return

    const saveJob = saveQueueRef.current
      .catch(() => undefined)
      .then(() => currentStore.saveActiveProfile(next))
    saveQueueRef.current = saveJob.catch(() => undefined)
    await saveJob
  }, [setActiveProfile])

  useEffect(() => {
    storeRef.current = store
  }, [store])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!store) {
        setStorageStatus('memory-fallback')
        setActiveProfile(seedProfile)
        return
      }
      try {
        const stored = await store.getActiveProfile()
        if (cancelled) return
        setActiveProfile(stored ?? seedProfile)
        setStorageStatus('ready')
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Storage unavailable.')
        setStorageStatus('memory-fallback')
        setActiveProfile(seedProfile)
      }
    }

    load()
    return () => { cancelled = true }
  }, [setActiveProfile, store, seedProfile])

  const importPhotos = useCallback(async (files: File[], defaultCountryCode?: string) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    let firstPhotoId: string | null = null
    const inputs = []
    const currentProfile = profileRef.current
    for (const file of imageFiles) {
      const id = nextPhotoId(currentProfile.id)
      // Hyphens keep the key safe as a URL path segment (/api/photo/<key>)
      const blobKey = `photo-${currentProfile.id}-${id}`
      firstPhotoId ??= id
      if (storeRef.current?.putPhotoBlob) await storeRef.current.putPhotoBlob(blobKey, file)
      inputs.push({
        id,
        blobKey,
        objectUrl: `/api/photo/${blobKey}`,
        mimeType: file.type,
        fileName: file.name,
      })
    }

    await persistProfile(appendLocalPhotos(profileRef.current, inputs, defaultCountryCode))
    setPendingEditPhotoId(firstPhotoId)
  }, [persistProfile])

  const editPhoto = useCallback(async (photoId: string, draft: PhotoEditDraftData) => {
    const next = applyPhotoEditDraft(profileRef.current, photoId, draft)
    const issues = validateProfile(next)
    if (issues.length > 0) {
      setErrorMessage(issues[0])
      throw new Error(issues[0])
    }
    setErrorMessage(undefined)
    await persistProfile(next)
  }, [persistProfile])

  const deletePhoto = useCallback(async (photoId: string) => {
    const currentProfile = profileRef.current
    const photo = currentProfile.photos.find(item => item.id === photoId)
    const next = removeStoredPhoto(currentProfile, photoId)
    if (photo?.source?.kind === 'localBlob' && storeRef.current?.deletePhotoBlob) {
      await storeRef.current.deletePhotoBlob(photo.source.key)
    }
    await persistProfile(next)
  }, [persistProfile])

  const setCountryHero = useCallback(async (countryCode: string, photoId: string, framing: PhotoFrameTransform = { x: 0, y: 0, scale: 1 }) => {
    await persistProfile(setCountryFraming(profileRef.current, countryCode, photoId, framing))
  }, [persistProfile])

  const setSubdivisionHero = useCallback(async (subdivisionCode: string, photoId: string, framing: PhotoFrameTransform = { x: 0, y: 0, scale: 1 }) => {
    await persistProfile(setSubdivisionFraming(profileRef.current, subdivisionCode, photoId, framing))
  }, [persistProfile])

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
