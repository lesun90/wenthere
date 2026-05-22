'use client'

import { useMemo, useState } from 'react'
import type { ProfileIndex, TravelerProfile } from '../lib/types'
import { travelerProfile } from '../data/demoProfile'
import { buildProfileIndex } from '../lib/geodata'
import { useTheme } from '../lib/theme-context'

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export function IdentityStrip({
  profile = travelerProfile,
  profileIndex,
  onOpenDrawer,
  drawerOpen,
}: {
  profile?: TravelerProfile
  profileIndex?: ProfileIndex
  onOpenDrawer?: () => void
  drawerOpen?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const { theme, toggle } = useTheme()
  const index = useMemo(() => profileIndex ?? buildProfileIndex(profile), [profile, profileIndex])

  const countryCount = index.stats.countryCount
  const placeCount = index.stats.placeCount

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div
      className="identity-strip"
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: drawerOpen ? 'translateX(calc(-50% - 190px))' : 'translateX(-50%)',
        transition: 'transform 340ms cubic-bezier(0.16,1,0.3,1)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 9999,
        padding: '8px 20px',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        color: 'var(--text-primary)',
        fontSize: 18,
        fontFamily: 'var(--font-caveat), cursive',
        fontWeight: 600,
        lineHeight: 1,
      }}>
        beenthere
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>·</span>
      <span style={{
        color: 'var(--text-secondary)',
        fontSize: 13,
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}>
        {profile.name}
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>·</span>
      <span style={{
        color: 'var(--text-secondary)',
        fontSize: 13,
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}>
        {countryCount} {countryCount === 1 ? 'country' : 'countries'}
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>·</span>
      <span style={{
        color: 'var(--text-secondary)',
        fontSize: 13,
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}>
        {placeCount} {placeCount === 1 ? 'place' : 'places'}
      </span>
      {onOpenDrawer && (
        <button
          onClick={onOpenDrawer}
          aria-label="Manage photos"
          className={`add-photos-btn${drawerOpen ? ' active' : ''}`}
          style={{
            marginLeft: 4,
            background: 'none',
            borderRadius: 9999,
            fontSize: 12,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            cursor: 'pointer',
            padding: '3px 10px',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Add
        </button>
      )}
      <button
        onClick={handleShare}
        className={`share-btn${copied ? ' copied' : ''}`}
        style={{
          marginLeft: 4,
          background: 'none',
          borderRadius: 9999,
          fontSize: 12,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          cursor: 'pointer',
          padding: '3px 10px',
          lineHeight: 1.5,
        }}
      >
        {copied ? 'Copied!' : '↗ Share'}
      </button>
      <button
        onClick={toggle}
        className="theme-toggle"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          background: 'none',
          borderRadius: 9999,
          cursor: 'pointer',
          padding: '4px 7px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  )
}
