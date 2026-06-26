'use client'

import { useState } from 'react'
import { IdentityStrip } from './IdentityStrip'
import { PhotoManagementDrawer, type PhotoEditDraft } from './globe/PhotoManagementDrawer'
import type { TravelerProfile, ProfileIndex, TravelPhoto } from '../lib/types'

interface Props {
  profile: TravelerProfile
  profileIndex: ProfileIndex
  unplacedPhotos?: TravelPhoto[]
  drawerOpen?: boolean
  onDrawerOpenChange?: (open: boolean) => void
  pendingEditPhotoId?: string | null
  onPendingEditPhotoHandled?: () => void
  storageMessage?: string
  targetCountry?: { code: string; name: string } | null
  onImportFiles?: (files: File[], defaultCountryCode?: string) => void
  onDeletePhoto?: (photoId: string) => void
  onEditPhoto?: (photoId: string, draft: PhotoEditDraft) => void
  onLocatePhoto?: (photo: TravelPhoto) => void
}

export function ProfileUI({
  profile,
  profileIndex,
  unplacedPhotos,
  drawerOpen: drawerOpenProp,
  onDrawerOpenChange,
  pendingEditPhotoId,
  onPendingEditPhotoHandled,
  storageMessage,
  targetCountry,
  onImportFiles,
  onDeletePhoto,
  onEditPhoto,
  onLocatePhoto,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const drawerOpen = drawerOpenProp ?? internalOpen
  const setDrawerOpen = onDrawerOpenChange ?? setInternalOpen

  return (
    <>
      <IdentityStrip
        profile={profile}
        profileIndex={profileIndex}
        onOpenDrawer={() => setDrawerOpen(!drawerOpen)}
        drawerOpen={drawerOpen}
      />
      <PhotoManagementDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profileIndex={profileIndex}
        unplacedPhotos={unplacedPhotos}
        pendingEditPhotoId={pendingEditPhotoId}
        onPendingEditPhotoHandled={onPendingEditPhotoHandled}
        storageMessage={storageMessage}
        targetCountry={targetCountry}
        onImportFiles={onImportFiles}
        onDeletePhoto={onDeletePhoto}
        onEditPhoto={onEditPhoto}
        onLocatePhoto={onLocatePhoto}
      />
    </>
  )
}
