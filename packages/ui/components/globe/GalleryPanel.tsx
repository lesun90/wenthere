'use client'

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Geometry } from 'geojson'
import type { ProfileIndex } from '@beenthere/domain/lib/types'
import { geoJsonToSvgPath, geometryFrameBounds } from '../../lib/geomath'
import { getSubdivisionGeometry, getCountryGeometry } from '../../lib/geo-registry'
import { shapeFrameToTextureTransform } from './framingTransform'
import type { HeroTransform } from './types'

interface Props {
  subdivisionId: string
  countryCode: string
  onBack: () => void
  initialHeroUrl?: string
  initialCountryHeroUrl?: string
  initialSubdivisionTransform?: HeroTransform
  initialCountryTransform?: HeroTransform
  onHeroChange?: (subdivisionId: string, heroUrl: string, photoId: string) => void
  onCountryHeroChange?: (countryCode: string, heroUrl: string, photoId: string) => void
  onSubdivisionTransformChange?: (subdivisionId: string, transform: HeroTransform) => void
  onCountryTransformChange?: (countryCode: string, transform: HeroTransform) => void
  onPresentationCommit?: (payload: {
    subdivisionId: string
    countryCode: string
    subdivisionPhotoId: string
    countryPhotoId: string
    subdivisionTransform: HeroTransform
    countryTransform: HeroTransform
  }) => void
  clickOrigin?: { x: number; y: number }
  profileIndex: ProfileIndex
}

interface Photo {
  url: string
  caption: string
}

const ENTER_DURATION = 340
const EXIT_DURATION = 200
const DEFAULT_TRANSFORM: HeroTransform = { x: 0, y: 0, scale: 1 }
const MIN_SHAPE_SCALE = 0.2
const MAX_SHAPE_SCALE = 3.0
const HERO_IMAGE_OBJECT_FIT = 'contain'

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

        {canPrev && (
          <button
            onClick={e => { e.stopPropagation(); setIndex(i => i - 1) }}
            aria-label="Previous photo"
            style={{ ...navBtn, left: 14 }}
          >‹</button>
        )}
        {canNext && (
          <button
            onClick={e => { e.stopPropagation(); setIndex(i => i + 1) }}
            aria-label="Next photo"
            style={{ ...navBtn, right: 14 }}
          >›</button>
        )}

        <img
          key={index}
          src={photo.url}
          alt={photo.caption}
          decoding="async"
          style={{ display: 'block', width: '100%', objectFit: 'cover', maxHeight: 'min(82vh, 660px)' }}
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

function ShapePreviewButton({
  label,
  imageUrl,
  geometry,
  transform,
  onClick,
}: {
  label: string
  imageUrl: string
  geometry: Geometry
  transform: HeroTransform
  onClick: () => void
}) {
  const size = 54
  const cx = size / 2
  const cy = size / 2
  const shapePath = useMemo(() => geoJsonToSvgPath(geometry, size, size, 5), [geometry])
  const clipId = useId().replace(/:/g, '')

  const tx = transform.x * size
  const ty = transform.y * size

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: size,
        height: size,
        padding: 0,
        border: '1.5px solid rgba(255,255,255,0.28)',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'rgba(0,0,0,0.32)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.32)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={`sp-${clipId}`}>
            <path d={shapePath} />
          </clipPath>
        </defs>
        <g clipPath={`url(#sp-${clipId})`}>
          <g transform={`translate(${cx + tx}, ${cy + ty}) scale(${transform.scale})`}>
            <image
              href={imageUrl}
              x={-cx}
              y={-cy}
              width={size}
              height={size}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        </g>
        <path
          d={shapePath}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <div style={{
        position: 'absolute',
        bottom: 3,
        right: 3,
        width: 14,
        height: 14,
        borderRadius: 4,
        background: 'rgba(0,0,0,0.60)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
          <path d="M2 5.5V2h3.5M14 5.5V2h-3.5M2 10.5V14h3.5M14 10.5V14h-3.5" stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  )
}

function HeroFramingOverlay({
  imageUrl,
  geometry,
  initialTransform,
  onCommit,
  onCancel,
}: {
  imageUrl: string
  geometry: Geometry | null
  initialTransform: HeroTransform
  onCommit: (t: HeroTransform) => void
  onCancel: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const maskGroupRef = useRef<SVGGElement>(null)
  const borderGroupRef = useRef<SVGGElement>(null)
  const liveRef = useRef<HeroTransform>({ ...initialTransform })
  const shapeStateRef = useRef({ shapeX: 0, shapeY: 0, shapeScale: 1 })
  const dragRef = useRef<{
    startX: number; startY: number
    startShapeX: number; startShapeY: number
    isDrag: boolean
  } | null>(null)
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null)
  // Avoid tap-dismiss after a two-finger gesture ends.
  const wasMultitouchRef = useRef(false)

  const [visible, setVisible] = useState(false)
  const [shapePath, setShapePath] = useState('')
  const maskId = useId().replace(/:/g, '')

  // Returns the rendered image dimensions for objectFit:contain.
  // The image is centered, so transform offsets must be in image space, not container space.
  function getRenderedImageRect(cw: number, ch: number): { x: number; y: number; width: number; height: number } {
    const img = imgRef.current
    const nw = img?.naturalWidth ?? 0
    const nh = img?.naturalHeight ?? 0
    if (!nw || !nh) return { x: 0, y: 0, width: cw, height: ch }
    const size = nw / nh > cw / ch
      ? { width: cw, height: cw * nh / nw }
      : { width: ch * nw / nh, height: ch }
    return {
      x: (cw - size.width) / 2,
      y: (ch - size.height) / 2,
      ...size,
    }
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  useLayoutEffect(() => {
    if (!geometry || !containerRef.current) return
    const { clientWidth: cw, clientHeight: ch } = containerRef.current
    if (cw === 0 || ch === 0) return
    const { width: rw, height: rh } = getRenderedImageRect(cw, ch)
    const shapeScale = 1 / initialTransform.scale
    // Invert the coupled formula: x = -shapeX/(rw*shapeScale) → shapeX = -x*rw*shapeScale = -x*rw/scale
    shapeStateRef.current = {
      shapeX: -initialTransform.x * rw * shapeScale,
      shapeY: -initialTransform.y * rh * shapeScale,
      shapeScale,
    }
    setShapePath(geoJsonToSvgPath(geometry, cw, ch, 24))
  }, [geometry])

  useLayoutEffect(() => {
    if (!shapePath || !containerRef.current) return
    const { clientWidth: cw, clientHeight: ch } = containerRef.current
    const { shapeX, shapeY, shapeScale } = shapeStateRef.current
    const svgTransform = buildSvgTransform(cw / 2, ch / 2, shapeX, shapeY, shapeScale)
    maskGroupRef.current?.setAttribute('transform', svgTransform)
    borderGroupRef.current?.setAttribute('transform', svgTransform)
  }, [shapePath])

  function buildSvgTransform(cx: number, cy: number, sx: number, sy: number, ss: number) {
    return `translate(${cx + sx},${cy + sy}) scale(${ss}) translate(${-cx},${-cy})`
  }

  // Update DOM refs directly during drag/pinch to avoid React renders.
  function applyShapeTransform(shapeX: number, shapeY: number, shapeScale: number) {
    if (!containerRef.current) return
    const { clientWidth: cw, clientHeight: ch } = containerRef.current
    const t = buildSvgTransform(cw / 2, ch / 2, shapeX, shapeY, shapeScale)
    maskGroupRef.current?.setAttribute('transform', t)
    borderGroupRef.current?.setAttribute('transform', t)
    shapeStateRef.current = { shapeX, shapeY, shapeScale }
    // Keep x/y/scale for reopening the editor, and store an explicit UV transform
    // for the globe because its texture coordinates use the fitted geometry bounds,
    // not the gallery container bounds.
    const imageRect = getRenderedImageRect(cw, ch)
    const textureTransform = geometry
      ? shapeFrameToTextureTransform({
        frame: { width: cw, height: ch },
        imageRect,
        shapeBounds: geometryFrameBounds(geometry, cw, ch, 24) ?? { x: 0, y: 0, width: cw, height: ch },
        shapeX,
        shapeY,
        shapeScale,
      })
      : null
    liveRef.current = {
      x: -shapeX / (imageRect.width * shapeScale),
      y: -shapeY / (imageRect.height * shapeScale),
      scale: 1 / shapeScale,
      ...(textureTransform
        ? {
          textureOffsetX: textureTransform.offset.x,
          textureOffsetY: textureTransform.offset.y,
          textureRepeatX: textureTransform.repeat.x,
          textureRepeatY: textureTransform.repeat.y,
        }
        : {}),
    }
  }

  function dismiss(commit: boolean) {
    setVisible(false)
    setTimeout(() => {
      if (commit) onCommit(liveRef.current)
      else onCancel()
    }, 100)
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startShapeX: shapeStateRef.current.shapeX,
      startShapeY: shapeStateRef.current.shapeY,
      isDrag: false,
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (e.pointerType === 'touch' || !dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (!dragRef.current.isDrag && Math.sqrt(dx * dx + dy * dy) >= 5) {
      dragRef.current.isDrag = true
    }
    if (!dragRef.current.isDrag) return
    applyShapeTransform(
      dragRef.current.startShapeX + dx,
      dragRef.current.startShapeY + dy,
      shapeStateRef.current.shapeScale,
    )
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return
    const wasDrag = dragRef.current?.isDrag ?? false
    dragRef.current = null
    if (!wasDrag) dismiss(true)
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault()
    const { shapeX, shapeY, shapeScale } = shapeStateRef.current
    const newScale = Math.max(MIN_SHAPE_SCALE, Math.min(MAX_SHAPE_SCALE, shapeScale * (1 - e.deltaY * 0.001)))
    applyShapeTransform(shapeX, shapeY, newScale)
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      if (!dragRef.current) wasMultitouchRef.current = false
      dragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startShapeX: shapeStateRef.current.shapeX,
        startShapeY: shapeStateRef.current.shapeY,
        isDrag: false,
      }
    } else if (e.touches.length === 2) {
      wasMultitouchRef.current = true
      dragRef.current = null
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      pinchRef.current = {
        startDist: Math.sqrt(dx * dx + dy * dy),
        startScale: shapeStateRef.current.shapeScale,
      }
    }
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault()
    const { shapeX, shapeY, shapeScale } = shapeStateRef.current
    if (e.touches.length === 1 && dragRef.current) {
      const dx = e.touches[0].clientX - dragRef.current.startX
      const dy = e.touches[0].clientY - dragRef.current.startY
      if (!dragRef.current.isDrag && Math.sqrt(dx * dx + dy * dy) >= 5) {
        dragRef.current.isDrag = true
      }
      if (!dragRef.current.isDrag) return
      applyShapeTransform(dragRef.current.startShapeX + dx, dragRef.current.startShapeY + dy, shapeScale)
    } else if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[1].clientX - e.touches[0].clientX
      const dy = e.touches[1].clientY - e.touches[0].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const newScale = Math.max(MIN_SHAPE_SCALE, Math.min(MAX_SHAPE_SCALE, pinchRef.current.startScale * dist / pinchRef.current.startDist))
      applyShapeTransform(shapeX, shapeY, newScale)
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length === 0) {
      const wasDrag = dragRef.current?.isDrag ?? true
      const wasMultitouch = wasMultitouchRef.current
      dragRef.current = null
      pinchRef.current = null
      wasMultitouchRef.current = false
      if (!wasDrag && !wasMultitouch) dismiss(true)
    } else if (e.touches.length === 1 && pinchRef.current) {
      pinchRef.current = null
      dragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startShapeX: shapeStateRef.current.shapeX,
        startShapeY: shapeStateRef.current.shapeY,
        isDrag: false,
      }
    } else {
      dragRef.current = null
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        borderRadius: 18,
        cursor: 'crosshair',
        userSelect: 'none',
        touchAction: 'none',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transition: `opacity ${visible ? 150 : 100}ms ease`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt=""
        decoding="async"
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: HERO_IMAGE_OBJECT_FIT,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      {shapePath && (
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
          aria-hidden="true"
        >
          <defs>
            <mask id={`fm-${maskId}`}>
              <rect width="100%" height="100%" fill="white" />
              <g ref={maskGroupRef}>
                <path d={shapePath} fill="black" />
              </g>
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.52)" mask={`url(#fm-${maskId})`} />
          <g ref={borderGroupRef}>
            <path
              d={shapePath}
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
      )}

      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px 32px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => dismiss(false)}
          style={{
            ...GLASS_BTN,
            fontSize: 13,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            color: '#F8FAFC',
            padding: '5px 12px',
            border: '1px solid rgba(255,255,255,0.22)',
            background: 'rgba(0,0,0,0.40)',
            pointerEvents: 'auto',
          }}
        >
          Cancel
        </button>
        <span style={{
          flex: 1,
          textAlign: 'center',
          color: '#F8FAFC',
          fontSize: 13,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontWeight: 600,
          letterSpacing: '0.02em',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}>
          Adjust framing
        </span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: '28px 12px 14px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.72)',
        fontSize: 11,
        fontFamily: 'var(--font-dm-sans), sans-serif',
        letterSpacing: '0.04em',
        pointerEvents: 'none',
      }}>
        Drag frame · Scroll or pinch to resize · Tap to apply
      </div>
    </div>
  )
}

export function GalleryPanel({
  subdivisionId,
  countryCode,
  onBack,
  initialHeroUrl,
  initialCountryHeroUrl,
  initialSubdivisionTransform,
  initialCountryTransform,
  onHeroChange,
  onCountryHeroChange,
  onSubdivisionTransformChange,
  onCountryTransformChange,
  onPresentationCommit,
  clickOrigin,
  profileIndex,
}: Props) {
  const subdivisionGeometry = getSubdivisionGeometry(subdivisionId)
  const countryGeometry = getCountryGeometry(countryCode)

  const summary = profileIndex.subdivisionSummariesByCode[subdivisionId]
  const photos = summary?.photos ?? []
  const name = summary?.name ?? ''

  const [visible, setVisible] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [heroUrl, setHeroUrl] = useState<string>(initialHeroUrl ?? summary?.heroPic ?? photos[0]?.url ?? '')
  const [countryHeroUrl, setCountryHeroUrl] = useState<string>(initialCountryHeroUrl ?? '')
  const [stagedSubTransform, setStagedSubTransform] = useState<HeroTransform>(initialSubdivisionTransform ?? DEFAULT_TRANSFORM)
  const [stagedCountryTransform, setStagedCountryTransform] = useState<HeroTransform>(initialCountryTransform ?? DEFAULT_TRANSFORM)
  const [editingShape, setEditingShape] = useState<'subdivision' | 'country' | null>(null)
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
    const subdivisionHeroId = photos.find(photo => photo.url === heroUrl)?.id
    const countryHeroId = photos.find(photo => photo.url === countryHeroUrl)?.id
    if (subdivisionHeroId) onHeroChange?.(subdivisionId, heroUrl, subdivisionHeroId)
    if (countryHeroId) onCountryHeroChange?.(countryCode, countryHeroUrl, countryHeroId)
    onSubdivisionTransformChange?.(subdivisionId, stagedSubTransform)
    onCountryTransformChange?.(countryCode, stagedCountryTransform)
    if (subdivisionHeroId && countryHeroId) {
      onPresentationCommit?.({
        subdivisionId,
        countryCode,
        subdivisionPhotoId: subdivisionHeroId,
        countryPhotoId: countryHeroId,
        subdivisionTransform: stagedSubTransform,
        countryTransform: stagedCountryTransform,
      })
    }
    setTimeout(onBack, EXIT_DURATION)
  }

  function handleSetHero(index: number, url: string) {
    setHeroUrl(url)
    setSelectedIndex(index)
  }

  function handleSetCountryHero(url: string) {
    setCountryHeroUrl(url)
  }

  function handleEditorCommit(transform: HeroTransform) {
    if (editingShape === 'subdivision') setStagedSubTransform(transform)
    else if (editingShape === 'country') setStagedCountryTransform(transform)
    setEditingShape(null)
  }

  function handleEditorCancel() {
    setEditingShape(null)
  }

  const heroPhoto = photos[selectedIndex]
  const isSubdivisionHero = heroPhoto?.url === heroUrl
  const isCountryHero = heroPhoto?.url === countryHeroUrl

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
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
          <div className="gallery-drag-handle" style={{ width: 36, height: 4, borderRadius: 2 }} />
        </div>

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

        {heroPhoto ? (
          <div
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              margin: '0 14px',
              borderRadius: 18,
              cursor: editingShape ? 'crosshair' : 'pointer',
              minHeight: 0,
              background: 'rgba(0,0,0,0.30)',
            }}
            onClick={editingShape ? undefined : () => setLightboxIndex(selectedIndex)}
          >
            <img
              key={selectedIndex}
              src={heroPhoto.url}
              alt={heroPhoto.caption}
              decoding="async"
              className="gallery-hero-img"
              style={{ width: '100%', height: '100%', objectFit: HERO_IMAGE_OBJECT_FIT, display: 'block' }}
            />

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

            {photos.length > 1 && (
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
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

            {!editingShape && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 54,
                  right: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
                onClick={e => e.stopPropagation()}
              >
                {isSubdivisionHero && subdivisionGeometry && (
                  <ShapePreviewButton
                    label="Adjust region framing"
                    imageUrl={heroUrl}
                    geometry={subdivisionGeometry}
                    transform={stagedSubTransform}
                    onClick={() => setEditingShape('subdivision')}
                  />
                )}
                {isCountryHero && countryGeometry && (
                  <ShapePreviewButton
                    label="Adjust country framing"
                    imageUrl={countryHeroUrl}
                    geometry={countryGeometry}
                    transform={stagedCountryTransform}
                    onClick={() => setEditingShape('country')}
                  />
                )}
              </div>
            )}

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

            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 45%)',
              pointerEvents: 'none',
              borderRadius: 18,
            }} />

            {editingShape && (
              <HeroFramingOverlay
                key={editingShape}
                imageUrl={editingShape === 'subdivision' ? heroUrl : countryHeroUrl}
                geometry={editingShape === 'subdivision' ? subdivisionGeometry : countryGeometry}
                initialTransform={editingShape === 'subdivision' ? stagedSubTransform : stagedCountryTransform}
                onCommit={handleEditorCommit}
                onCancel={handleEditorCancel}
              />
            )}
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
            <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'var(--font-dm-sans), sans-serif' }}>
              No memories yet
            </span>
          </div>
        )}

        {photos.length > 1 && (
          <div
            ref={thumbsRef}
            className="gallery-thumbs"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              overflowX: 'auto',
              overflowY: 'hidden',
              padding: '8px 14px',
              scrollbarWidth: 'none',
            }}
          >
            {photos.map((photo, i) => {
              const isSel = i === selectedIndex
              const isSubHero = photo.url === heroUrl
              const isCtryHero = photo.url === countryHeroUrl
              return (
                <div
                  key={photo.id}
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
                      loading={isSel ? 'eager' : 'lazy'}
                      decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {isSel && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.09)', pointerEvents: 'none' }} />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.11) 0%, transparent 50%)', pointerEvents: 'none' }} />
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => handleSetHero(i, photo.url)}
                      aria-label={isSubHero ? 'Region hero photo' : 'Set as region hero'}
                      title={isSubHero ? 'Region hero' : 'Set as region hero'}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        background: isSubHero ? 'rgba(251,191,36,0.88)' : 'rgba(0,0,0,0.46)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        border: isSubHero ? '1px solid rgba(250,204,21,0.70)' : '1px solid rgba(255,255,255,0.22)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isSubHero ? 'default' : 'pointer',
                        transition: 'background 180ms ease, border-color 180ms ease',
                        flexShrink: 0,
                      }}
                    >
                      {isSubHero ? (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                        </svg>
                      ) : (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#F8FAFC" strokeWidth="2" strokeLinejoin="round">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                        </svg>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetCountryHero(photo.url)}
                      aria-label={isCtryHero ? 'Country hero photo' : 'Set as country hero'}
                      title={isCtryHero ? 'Country hero' : 'Set as country hero'}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        background: isCtryHero ? 'rgba(96,165,250,0.88)' : 'rgba(0,0,0,0.46)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        border: isCtryHero ? '1px solid rgba(147,197,253,0.70)' : '1px solid rgba(255,255,255,0.22)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isCtryHero ? 'default' : 'pointer',
                        transition: 'background 180ms ease, border-color 180ms ease',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={isCtryHero ? '#fff' : '#F8FAFC'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    </button>
                  </div>
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
