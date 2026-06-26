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
  const [addPhotosCountry, setAddPhotosCountry] = useState<{ code: string; name: string } | null>(null)
  const [locateRequest, setLocateRequest] = useState<{ countryCode: string; requestId: number } | null>(null)
  const store = useMemo(() => new CloudProfileStore(), [])

  function handleDrawerOpenChange(open: boolean) {
    setDrawerOpen(open)
    if (!open) setAddPhotosCountry(null)
  }

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
                  onRequestAddPhotos={(code, name) => {
                    setDrawerOpen(true)
                    setAddPhotosCountry({ code, name })
                  }}
                  locateRequest={locateRequest}
                />
              </Suspense>
              <ProfileUI
                profile={profileState.profile}
                profileIndex={profileState.profileIndex}
                unplacedPhotos={profileState.unplacedPhotos}
                drawerOpen={drawerOpen}
                onDrawerOpenChange={handleDrawerOpenChange}
                pendingEditPhotoId={profileState.pendingEditPhotoId}
                onPendingEditPhotoHandled={profileState.clearPendingEditPhoto}
                storageMessage={profileState.errorMessage}
                targetCountry={addPhotosCountry}
                onImportFiles={(files, defaultCountryCode, onProgress) => {
                  setDrawerOpen(true)
                  return profileState.importPhotos(files, defaultCountryCode, onProgress)
                }}
                onDeletePhoto={photoId => void profileState.deletePhoto(photoId)}
                onEditPhoto={(photoId, draft) => profileState.editPhoto(photoId, draft)}
                onLocatePhoto={photo => {
                  const countryCode = photo.location.countryCode
                  if (!countryCode) return
                  setLocateRequest({ countryCode, requestId: Date.now() })
                }}
              />
            </>
          )}
        </main>
      )}
    </ProfileProvider>
  )
}
