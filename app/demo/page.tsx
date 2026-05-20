import { Suspense } from 'react'
import { GlobeScene } from '@/components/globe/GlobeScene'
import { IdentityStrip } from '@/components/IdentityStrip'

function GlobeLoader() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#080c14',
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
        color: '#F8FAFC',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        beenthere
      </span>
    </div>
  )
}

export default function DemoPage() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <Suspense fallback={<GlobeLoader />}>
        <GlobeScene />
      </Suspense>
      <IdentityStrip />
    </main>
  )
}
