'use client'

import { Suspense, useMemo, useState } from 'react'
import type { TravelerProfile } from '@beenthere/ui'
import { GlobeScene } from '@beenthere/ui/components/globe/GlobeScene'
import { ProfileUI } from '@beenthere/ui/components/ProfileUI'
import { ProfileProvider } from '@beenthere/ui/components/profile/ProfileProvider'
import { LocalProfileStore } from '@beenthere/storage-local/local-store'

function GlobeLoader() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--bg, #080c14)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <span style={{
        fontFamily: 'var(--font-caveat), cursive',
        fontSize: 28,
        fontWeight: 600,
        color: 'var(--text-primary, #F8FAFC)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        beenthere
      </span>
    </div>
  )
}

export function ProfileExperience({ seedProfile }: { seedProfile: TravelerProfile }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addPhotosCountry, setAddPhotosCountry] = useState<{ code: string; name: string } | null>(null)
  const [locateRequest, setLocateRequest] = useState<{ countryCode: string; requestId: number } | null>(null)
  const store = useMemo(() => new LocalProfileStore(seedProfile.id), [seedProfile.id])

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
                storageMessage={profileState.storageStatus === 'memory-fallback' ? 'Offline storage is unavailable in this browser session.' : profileState.errorMessage}
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
