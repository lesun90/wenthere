'use client'

import { useEffect, useRef, useState } from 'react'
import { travelerProfile } from '../../data/seed'

interface Props {
  subdivisionId: string
  onBack: () => void
}

const ENTER_DURATION = 320
const EXIT_DURATION = 200

export function GalleryPanel({ subdivisionId, onBack }: Props) {
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)

  const reducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleClose() {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(onBack, EXIT_DURATION)
  }

  const memory = travelerProfile.countries
    .flatMap(c => c.subdivisions)
    .find(s => s.subdivisionCode === subdivisionId)

  const photos = memory?.photos ?? []
  const name = memory?.name ?? ''
  const placeCount = photos.length

  const enterTransition = reducedMotion
    ? `opacity ${ENTER_DURATION}ms ease-out`
    : `transform ${ENTER_DURATION}ms cubic-bezier(0.16,1,0.3,1), opacity ${ENTER_DURATION}ms ease-out`

  const exitTransition = reducedMotion
    ? `opacity ${EXIT_DURATION}ms ease-in`
    : `transform ${EXIT_DURATION}ms ease-in, opacity ${EXIT_DURATION}ms ease-in`

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60vh',
        zIndex: 50,
        background: 'rgba(8, 12, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '20px 20px 0 0',
        display: 'flex',
        flexDirection: 'column',
        transform: visible
          ? 'translateY(0)'
          : reducedMotion ? undefined : 'translateY(100%)',
        opacity: visible ? 1 : 0,
        transition: visible ? enterTransition : exitTransition,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px 12px',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            fontSize: 13,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            cursor: 'pointer',
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            minWidth: 60,
          }}
        >
          ← Back
        </button>
        <span style={{
          flex: 1,
          textAlign: 'center',
          color: '#F8FAFC',
          fontSize: 22,
          fontFamily: 'var(--font-caveat), cursive',
          fontWeight: 600,
        }}>
          {name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 60, justifyContent: 'flex-end' }}>
          <span style={{ color: '#94A3B8', fontSize: 12, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
            {placeCount} {placeCount === 1 ? 'place' : 'places'}
          </span>
          <button
            onClick={handleClose}
            aria-label="Close gallery"
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Photo strip */}
      <div style={{
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.15) transparent',
      }}>
        {photos.length === 0 ? (
          <span style={{ color: '#94A3B8', fontSize: 14, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
            No photos found
          </span>
        ) : (
          photos.map((photo, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: 160,
                height: 120,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <img
                src={photo.url}
                alt={photo.caption}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '20px 8px 8px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.6))',
              }}>
                <span style={{
                  color: '#E2E8F0',
                  fontSize: 11,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  lineHeight: 1.3,
                  display: 'block',
                }}>
                  {photo.caption}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
