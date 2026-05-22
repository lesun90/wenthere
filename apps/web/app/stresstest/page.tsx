import { Suspense } from 'react'
import { GlobeScene } from '@beenthere/ui/components/globe/GlobeScene'
import { ProfileUI } from '@beenthere/ui/components/ProfileUI'
import { roamerProfile } from '@beenthere/ui/data/roamerProfile'
import { buildProfileIndex } from '@beenthere/ui/lib/geodata'

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

export default function StressTestPage() {
  const profileIndex = buildProfileIndex(roamerProfile)

  return (
    <main className="fixed inset-0 overflow-hidden">
      <Suspense fallback={<GlobeLoader />}>
        <GlobeScene profile={roamerProfile} />
      </Suspense>
      <ProfileUI profile={roamerProfile} profileIndex={profileIndex} />
    </main>
  )
}
