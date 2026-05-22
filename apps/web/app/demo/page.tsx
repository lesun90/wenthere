'use client'

import { Suspense, useState } from 'react'
import { GlobeScene } from '@beenthere/ui/components/globe/GlobeScene'
import { ProfileUI } from '@beenthere/ui/components/ProfileUI'
import { ProfileProvider } from '@beenthere/ui/components/profile/ProfileProvider'
import travelerProfile from '../../data/demoProfile.json'
import { LocalProfileStore } from '@beenthere/storage-local/local-store'

const store = new LocalProfileStore()

const DRAWER_WIDTH = 380

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

export default function DemoPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <ProfileProvider seedProfile={travelerProfile} store={store}>
      {profileState => (
        <main className="fixed inset-0 overflow-hidden">
          {profileState.loading ? (
            <GlobeLoader />
          ) : (
            <>
              <div
                className="globe-shift-wrapper"
                style={{
                  width: '100%',
                  height: '100%',
                  transform: drawerOpen ? `translateX(${-(DRAWER_WIDTH / 2)}px)` : 'translateX(0)',
                  transition: 'transform 340ms cubic-bezier(0.16,1,0.3,1)',
                  willChange: 'transform',
                }}
              >
                <Suspense fallback={<GlobeLoader />}>
                  <GlobeScene
                    profile={profileState.profile}
                    onSetCountryHero={profileState.setCountryHero}
                    onSetSubdivisionHero={profileState.setSubdivisionHero}
                  />
                </Suspense>
              </div>
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
