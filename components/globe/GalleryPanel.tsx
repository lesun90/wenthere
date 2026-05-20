'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { travelerProfile } from '../../data/seed'

interface Props {
  subdivisionId: string
  onBack: () => void
  initialHeroUrl?: string
  onHeroChange?: (subdivisionId: string, heroUrl: string) => void
  clickOrigin?: { x: number; y: number }
}

interface Photo {
  url: string
  caption: string
}

const ENTER_DURATION = 340
const EXIT_DURATION = 200

const GLASS_BTN: React.CSSProperties = {
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: 999,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function Lightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: Photo[]
  startIndex: number
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(startIndex)
  const photo = photos[index]
  const canPrev = index > 0
  const canNext = index < photos.length - 1

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
      if (e.key === 'ArrowRight' && canNext) setIndex(i => i + 1)
      if (e.key === 'ArrowLeft' && canPrev) setIndex(i => i - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canPrev, canNext])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 180)
  }

  const navBtn: React.CSSProperties = {
    ...GLASS_BTN,
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 40,
    height: 40,
    zIndex: 10,
    fontSize: 22,
    color: '#F8FAFC',
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(0,0,0,0.48)',
  }

  return (
    <div
      className="lightbox-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || 'Photo'}
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${visible ? 220 : 180}ms ease`,
      }}
    >
      <div
        className="lightbox-card"
        onClick={e => e.stopPropagation()}
        style={{
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(20px)',
          opacity: visible ? 1 : 0,
          transition: `transform ${visible ? 300 : 180}ms cubic-bezier(0.16,1,0.3,1), opacity ${visible ? 300 : 180}ms ease`,
        }}
      >
        {/* Top bar */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ width: 32 }} />
          {photos.length > 1 && (
            <div style={{
              background: 'rgba(0,0,0,0.50)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 999,
              padding: '4px 14px',
              color: '#F8FAFC',
              fontSize: 12,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontWeight: 500,
              letterSpacing: '0.04em',
            }}>
              {index + 1} / {photos.length}
            </div>
          )}
          <button
            onClick={handleClose}
            aria-label="Close photo"
            style={{
              ...GLASS_BTN,
              width: 32,
              height: 32,
              background: 'rgba(0,0,0,0.48)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#F8FAFC',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Prev */}
        {canPrev && (
          <button
            onClick={e => { e.stopPropagation(); setIndex(i => i - 1) }}
            aria-label="Previous photo"
            style={{ ...navBtn, left: 14 }}
          >
            ‹
          </button>
        )}
        {/* Next */}
        {canNext && (
          <button
            onClick={e => { e.stopPropagation(); setIndex(i => i + 1) }}
            aria-label="Next photo"
            style={{ ...navBtn, right: 14 }}
          >
            ›
          </button>
        )}

        <img
          key={index}
          src={photo.url}
          alt={photo.caption}
          style={{
            display: 'block',
            width: '100%',
            objectFit: 'cover',
            maxHeight: 'min(82vh, 660px)',
          }}
        />

        {photo.caption && (
          <div className="lightbox-caption" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '44px 20px 20px' }}>
            <p style={{
              margin: 0,
              color: '#F8FAFC',
              fontSize: 14,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontWeight: 500,
              lineHeight: 1.45,
              textShadow: '0 1px 4px rgba(0,0,0,0.44)',
            }}>
              {photo.caption}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export function GalleryPanel({ subdivisionId, onBack, initialHeroUrl, onHeroChange, clickOrigin }: Props) {
  // Derive data before hooks — pure computation, always runs, stable reference
  const memory = travelerProfile.countries
    .flatMap(c => c.subdivisions)
    .find(s => s.subdivisionCode === subdivisionId)
  const photos = memory?.photos ?? []
  const name = memory?.name ?? ''

  // All state — heroUrl initialized correctly on first render, no seeding effect needed
  const [visible, setVisible] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [heroUrl, setHeroUrl] = useState<string>(initialHeroUrl ?? memory?.heroPic ?? photos[0]?.url ?? '')
  const closingRef = useRef(false)
  const thumbsRef = useRef<HTMLDivElement>(null)

  const reducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  const transformOrigin = useMemo(() => {
    if (!clickOrigin || typeof window === 'undefined') return '50% -8%'
    const panelTopPx = window.innerHeight * 0.28
    const panelHeightPx = window.innerHeight * 0.72
    const ox = ((clickOrigin.x / window.innerWidth) * 100).toFixed(1)
    const oy = (((clickOrigin.y - panelTopPx) / panelHeightPx) * 100).toFixed(1)
    return `${ox}% ${oy}%`
  }, [clickOrigin])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && lightboxIndex === null) handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex])

  useEffect(() => {
    const el = thumbsRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedIndex])

  function handleClose() {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(onBack, EXIT_DURATION)
  }

  function handleSetHero(index: number, url: string) {
    setHeroUrl(url)
    setSelectedIndex(index)
    onHeroChange?.(subdivisionId, url)
  }

  const heroPhoto = photos[selectedIndex]
  const isViewingHero = heroPhoto?.url === heroUrl

  const enterTr = reducedMotion
    ? `opacity ${ENTER_DURATION}ms ease-out`
    : `transform ${ENTER_DURATION}ms cubic-bezier(0.16,1,0.3,1), opacity ${ENTER_DURATION}ms ease-out`

  const exitTr = reducedMotion
    ? `opacity ${EXIT_DURATION}ms ease-in`
    : `transform ${EXIT_DURATION}ms cubic-bezier(0.4,0,1,1), opacity ${EXIT_DURATION}ms ease-in`

  return (
    <>
      <div
        className="gallery-panel"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '72vh',
          zIndex: 50,
          borderRadius: '24px 24px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transformOrigin,
          transform: visible ? 'scale(1)' : reducedMotion ? undefined : 'scale(0.72)',
          opacity: visible ? 1 : 0,
          transition: visible ? enterTr : exitTr,
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
          <div className="gallery-drag-handle" style={{ width: 36, height: 4, borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div
          className="gallery-panel-header"
          style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 10px', flexShrink: 0, gap: 8 }}
        >
          <button
            onClick={handleClose}
            aria-label="Back"
            className="gallery-nav-btn"
            style={{
              ...GLASS_BTN,
              justifyContent: 'flex-start',
              fontSize: 13,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              gap: 5,
              minWidth: 64,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <span style={{
              display: 'block',
              color: 'var(--text-primary)',
              fontSize: 22,
              fontFamily: 'var(--font-caveat), cursive',
              fontWeight: 600,
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {name}
            </span>
            <span style={{
              display: 'block',
              color: 'var(--text-secondary)',
              fontSize: 11,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}>
              {photos.length} {photos.length === 1 ? 'memory' : 'memories'}
            </span>
          </div>

          <div style={{ minWidth: 64, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleClose}
              aria-label="Close gallery"
              className="gallery-nav-btn"
              style={{ ...GLASS_BTN, width: 32, height: 32 }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hero image */}
        {heroPhoto ? (
          <div
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              margin: '0 14px',
              borderRadius: 18,
              cursor: 'pointer',
              minHeight: 0,
              background: 'rgba(0,0,0,0.30)',
            }}
            onClick={() => setLightboxIndex(selectedIndex)}
          >
            <img
              key={selectedIndex}
              src={heroPhoto.url}
              alt={heroPhoto.caption}
              className="gallery-hero-img"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />

            {/* Bottom gradient + caption */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '56px 16px 16px',
              background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.76))',
            }}>
              <p style={{
                margin: 0,
                color: '#F8FAFC',
                fontSize: 13,
                fontFamily: 'var(--font-dm-sans), sans-serif',
                fontWeight: 500,
                lineHeight: 1.4,
                textShadow: '0 1px 4px rgba(0,0,0,0.44)',
              }}>
                {heroPhoto.caption}
              </p>
            </div>

            {/* Top-right: counter + hero badge row */}
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              {isViewingHero && (
                <div style={{
                  background: 'rgba(0,0,0,0.50)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(250,204,21,0.45)',
                  borderRadius: 999,
                  padding: '3px 9px',
                  color: '#FBBF24',
                  fontSize: 11,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                  Hero
                </div>
              )}
              {photos.length > 1 && (
                <div style={{
                  background: 'rgba(0,0,0,0.50)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  color: '#F8FAFC',
                  fontSize: 11,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                }}>
                  {selectedIndex + 1} / {photos.length}
                </div>
              )}
            </div>

            {/* Expand icon */}
            <div style={{
              position: 'absolute',
              top: 12,
              left: 12,
              width: 30,
              height: 30,
              background: 'rgba(0,0,0,0.42)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 5.5V2h3.5M14 5.5V2h-3.5M2 10.5V14h3.5M14 10.5V14h-3.5" stroke="#F8FAFC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Top shimmer */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 45%)',
              pointerEvents: 'none',
              borderRadius: 18,
            }} />
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            margin: '0 14px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span style={{
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}>
              No memories yet
            </span>
          </div>
        )}

        {/* Thumbnail strip — only shown when multiple photos */}
        {photos.length > 1 && (
          <div
            ref={thumbsRef}
            className="gallery-thumbs"
            style={{
              height: 108,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              overflowX: 'auto',
              overflowY: 'hidden',
              padding: '8px 14px',
              scrollbarWidth: 'none',
            }}
          >
            {photos.map((photo, i) => {
              const isSel = i === selectedIndex
              const isHero = photo.url === heroUrl
              return (
                // Flex-column: image on top, star button below — no overlap, no z-index, no nesting
                <div
                  key={i}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    transform: isSel ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  {/* Thumbnail image — click to select */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedIndex(i)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedIndex(i) }}
                    aria-label={`Select photo: ${photo.caption}`}
                    aria-pressed={isSel}
                    style={{
                      width: 96,
                      height: 66,
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      boxShadow: isSel
                        ? '0 0 0 2.5px rgba(255,255,255,0.82), 0 4px 14px rgba(0,0,0,0.34)'
                        : '0 0 0 1px rgba(255,255,255,0.13), 0 3px 10px rgba(0,0,0,0.24)',
                      transition: 'box-shadow 180ms ease',
                    }}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {isSel && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.09)', pointerEvents: 'none' }} />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.11) 0%, transparent 50%)', pointerEvents: 'none' }} />
                  </div>

                  {/* Star button — separate row, zero overlap with thumbnail */}
                  <button
                    type="button"
                    onClick={() => handleSetHero(i, photo.url)}
                    aria-label={isHero ? 'Hero photo' : 'Set as hero'}
                    title={isHero ? 'Hero photo' : 'Set as hero'}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: isHero ? 'rgba(251,191,36,0.88)' : 'rgba(0,0,0,0.46)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      border: isHero ? '1px solid rgba(250,204,21,0.70)' : '1px solid rgba(255,255,255,0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isHero ? 'default' : 'pointer',
                      transition: 'background 180ms ease, border-color 180ms ease',
                      flexShrink: 0,
                    }}
                  >
                    {isHero ? (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                      </svg>
                    ) : (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#F8FAFC" strokeWidth="2" strokeLinejoin="round">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                      </svg>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ height: 14, flexShrink: 0 }} />
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
