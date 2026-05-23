'use client'

import { useState } from 'react'
import { IdentityStrip } from './IdentityStrip'
import { PhotoManagementDrawer, type PhotoEditDraft } from './globe/PhotoManagementDrawer'
import type { TravelerProfile, ProfileIndex, TravelPhoto } from '@beenthere/domain/lib/types'

interface Props {
  profile: TravelerProfile
  profileIndex: ProfileIndex
  unplacedPhotos?: TravelPhoto[]
  drawerOpen?: boolean
  onDrawerOpenChange?: (open: boolean) => void
  pendingEditPhotoId?: string | null
  onPendingEditPhotoHandled?: () => void
  storageMessage?: string
  onImportFiles?: (files: File[]) => void
  onDeletePhoto?: (photoId: string) => void
  onEditPhoto?: (photoId: string, draft: PhotoEditDraft) => void
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
  onImportFiles,
  onDeletePhoto,
  onEditPhoto,
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
        onImportFiles={onImportFiles}
        onDeletePhoto={onDeletePhoto}
        onEditPhoto={onEditPhoto}
      />
    </>
  )
}
