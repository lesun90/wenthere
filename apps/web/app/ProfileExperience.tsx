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
  const store = useMemo(() => new LocalProfileStore(seedProfile.id), [seedProfile.id])

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
                storageMessage={profileState.storageStatus === 'memory-fallback' ? 'Offline storage is unavailable in this browser session.' : profileState.errorMessage}
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
