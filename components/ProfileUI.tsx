'use client'

import { useState } from 'react'
import { IdentityStrip } from './IdentityStrip'
import { PhotoManagementDrawer } from './globe/PhotoManagementDrawer'
import type { TravelerProfile, ProfileIndex } from '../data/seed'

interface Props {
  profile: TravelerProfile
  profileIndex: ProfileIndex
  drawerOpen?: boolean
  onDrawerOpenChange?: (open: boolean) => void
}

export function ProfileUI({ profile, profileIndex, drawerOpen: drawerOpenProp, onDrawerOpenChange }: Props) {
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
      />
    </>
  )
}
