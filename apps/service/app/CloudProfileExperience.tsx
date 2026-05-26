'use client'

import { Suspense, useMemo, useState } from 'react'
import type { TravelerProfile } from '@beenthere/ui'
import { GlobeScene } from '@beenthere/ui/components/globe/GlobeScene'
import { ProfileProvider } from '@beenthere/ui/components/profile/ProfileProvider'
import { ProfileUI } from '@beenthere/ui/components/ProfileUI'
import { CloudProfileStore } from '@beenthere/storage-cloud'

function GlobeLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[var(--bg,#080c14)]">
      <span className="font-semibold text-[28px] text-[var(--text-primary,#F8FAFC)]">beenthere</span>
    </div>
  )
}

export function CloudProfileExperience({ seedProfile }: { seedProfile: TravelerProfile }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const store = useMemo(() => new CloudProfileStore(), [])

  return (
    <ProfileProvider seedProfile={seedProfile} store={store}>
      {profileState => (
        <main className="fixed inset-0 overflow-hidden">
          {profileState.loading ? (
            <GlobeLoader />
          ) : (
            <>
              <Suspense fallback={<GlobeLoader />}>
                <GlobeScene
                  profile={profileState.profile}
                  photoDrawerOpen={drawerOpen}
                  onSetCountryHero={profileState.setCountryHero}
                  onSetSubdivisionHero={profileState.setSubdivisionHero}
                />
              </Suspense>
              <ProfileUI
                profile={profileState.profile}
                profileIndex={profileState.profileIndex}
                unplacedPhotos={profileState.unplacedPhotos}
                drawerOpen={drawerOpen}
                onDrawerOpenChange={setDrawerOpen}
                pendingEditPhotoId={profileState.pendingEditPhotoId}
                onPendingEditPhotoHandled={profileState.clearPendingEditPhoto}
                storageMessage={profileState.errorMessage}
                onImportFiles={files => {
                  setDrawerOpen(true)
                  void profileState.importPhotos(files)
                }}
                onDeletePhoto={photoId => void profileState.deletePhoto(photoId)}
                onEditPhoto={(photoId, draft) => profileState.editPhoto(photoId, draft)}
              />
            </>
          )}
        </main>
      )}
    </ProfileProvider>
  )
}
