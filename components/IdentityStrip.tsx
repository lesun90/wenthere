'use client'

import { useState } from 'react'
import { travelerProfile } from '../data/seed'

export function IdentityStrip() {
  const [copied, setCopied] = useState(false)

  const countryCount = travelerProfile.countries.length
  const placeCount = travelerProfile.countries.reduce(
    (acc, c) => acc + c.subdivisions.reduce((a, s) => a + s.photos.length, 0),
    0,
  )

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'rgba(8, 12, 20, 0.72)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 9999,
      padding: '8px 20px',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        color: '#F8FAFC',
        fontSize: 18,
        fontFamily: 'var(--font-caveat), cursive',
        fontWeight: 600,
        lineHeight: 1,
      }}>
        beenthere
      </span>
      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>·</span>
      <span style={{
        color: '#94A3B8',
        fontSize: 13,
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}>
        {travelerProfile.name}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>·</span>
      <span style={{
        color: '#94A3B8',
        fontSize: 13,
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}>
        {countryCount} {countryCount === 1 ? 'country' : 'countries'}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>·</span>
      <span style={{
        color: '#94A3B8',
        fontSize: 13,
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}>
        {placeCount} {placeCount === 1 ? 'place' : 'places'}
      </span>
      <button
        onClick={handleShare}
        style={{
          marginLeft: 4,
          background: 'none',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 9999,
          color: copied ? '#60A5FA' : '#94A3B8',
          fontSize: 12,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          cursor: 'pointer',
          padding: '3px 10px',
          transition: 'color 150ms, border-color 150ms',
          lineHeight: 1.5,
        }}
      >
        {copied ? 'Copied!' : '↗ Share'}
      </button>
    </div>
  )
}
