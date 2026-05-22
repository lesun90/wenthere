'use client'

import { Suspense, useState } from 'react'
import { GlobeScene } from '@/components/globe/GlobeScene'
import { ProfileUI } from '@/components/ProfileUI'
import { travelerProfile } from '@/data/demoProfile'
import { buildProfileIndex } from '@/lib/geodata'

const profileIndex = buildProfileIndex(travelerProfile)

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
    <main className="fixed inset-0 overflow-hidden">
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
          <GlobeScene profile={travelerProfile} />
        </Suspense>
      </div>
      <ProfileUI
        profile={travelerProfile}
        profileIndex={profileIndex}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
      />
    </main>
  )
}
