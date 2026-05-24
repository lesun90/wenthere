'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { HoverInfo, HeroTransform } from './types'
import { geoJsonToSvgPath } from '../../lib/geomath'

const FRAME_VIEW_W = 200
const FRAME_VIEW_H = 132
const CARD_WIDTH = 286
const CARD_HEIGHT_EST = 170
const CURSOR_OFFSET_X = 20
const CURSOR_OFFSET_Y = -CARD_HEIGHT_EST / 2

interface Props {
  info: HoverInfo
  viewportWidth: number
  viewportHeight: number
}

function ShapedImage({
  href,
  clipId,
  transform,
}: {
  href: string
  clipId: string
  transform?: HeroTransform
}) {
  const cx = FRAME_VIEW_W / 2
  const cy = FRAME_VIEW_H / 2

  if (transform) {
    const tx = transform.x * FRAME_VIEW_W
    const ty = transform.y * FRAME_VIEW_H
    return (
      <g clipPath={`url(#${clipId})`}>
        <g transform={`translate(${cx + tx}, ${cy + ty}) scale(${transform.scale})`}>
          <image
            href={href}
            x={-cx}
            y={-cy}
            width={FRAME_VIEW_W}
            height={FRAME_VIEW_H}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      </g>
    )
  }

  return (
    <image
      href={href}
      x={0}
      y={0}
      width={FRAME_VIEW_W}
      height={FRAME_VIEW_H}
      preserveAspectRatio="xMidYMid slice"
      clipPath={`url(#${clipId})`}
    />
  )
}

export function FloatingCard({ info, viewportWidth, viewportHeight }: Props) {
  const [visible, setVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const mousePosRef = useRef({ x: info.screenX, y: info.screenY })
  const rafRef = useRef<number | null>(null)
  const prevNameRef = useRef<string | null>(null)
  const rawId = useId()
  const clipId = `clip${rawId.replace(/:/g, '')}`

  useEffect(() => {
    mousePosRef.current = { x: info.screenX, y: info.screenY }
    updateCardPosition()
  }, [info.screenX, info.screenY, viewportWidth, viewportHeight])

  useEffect(() => {
    updateCardPosition()
  })

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function updateCardPosition() {
    const card = cardRef.current
    if (!card) return

    const { x, y } = mousePosRef.current
    let left = x + CURSOR_OFFSET_X
    let top = y + CURSOR_OFFSET_Y

    if (left + CARD_WIDTH > viewportWidth - 8) left = x - CARD_WIDTH - CURSOR_OFFSET_X
    left = Math.min(Math.max(left, 8), Math.max(8, viewportWidth - CARD_WIDTH - 8))
    top = Math.min(Math.max(top, 8), Math.max(8, viewportHeight - CARD_HEIGHT_EST - 8))

    card.style.transform = `translate3d(${left}px, ${top}px, 0)`
  }

  useEffect(() => {
    function schedulePositionUpdate() {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        updateCardPosition()
      })
    }

    function onMove(e: MouseEvent) {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
      schedulePositionUpdate()
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [viewportWidth, viewportHeight])

  useEffect(() => {
    if (prevNameRef.current !== info.name) {
      setVisible(false)
      const frame = requestAnimationFrame(() => setVisible(true))
      prevNameRef.current = info.name
      return () => cancelAnimationFrame(frame)
    }
  }, [info.name])

  useEffect(() => {
    setVisible(true)
    prevNameRef.current = info.name
  }, [])

  const shapePath = useMemo(() => (
    geoJsonToSvgPath(info.geometry, FRAME_VIEW_W, FRAME_VIEW_H, 10)
  ), [info.geometry])
  const photoUrls = [info.heroPicUrl, ...info.otherPicUrls].slice(0, 3)

  return (
    <div
      ref={cardRef}
      className="floating-card"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: CARD_WIDTH,
        pointerEvents: 'none',
        zIndex: 30,
        opacity: visible ? 1 : 0,
        transition: visible ? 'opacity 150ms ease-out' : 'opacity 100ms ease-in',
        transform: `translate3d(${info.screenX + CURSOR_OFFSET_X}px, ${info.screenY + CURSOR_OFFSET_Y}px, 0)`,
        willChange: 'transform, opacity',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderRadius: 18,
        padding: 16,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '132px 1fr', gap: 14, alignItems: 'center' }}>
        <div
          style={{
            width: 132,
            height: 96,
            display: 'grid',
            placeItems: 'center',
            filter: 'drop-shadow(0 16px 24px rgba(0,0,0,0.34)) drop-shadow(0 0 18px rgba(96,165,250,0.22))',
          }}
        >
          {shapePath ? (
            <svg
              viewBox={`0 0 ${FRAME_VIEW_W} ${FRAME_VIEW_H}`}
              width="100%"
              height="100%"
              style={{ display: 'block', overflow: 'visible' }}
              aria-hidden="true"
            >
              <defs>
                <clipPath id={clipId}>
                  <path d={shapePath} />
                </clipPath>
                <linearGradient id={`${clipId}Shine`} x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="rgba(255,255,255,0.34)" />
                  <stop offset="0.44" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>
              <ShapedImage href={info.heroPicUrl} clipId={clipId} transform={info.heroTransform} />
              <path d={shapePath} fill={`url(#${clipId}Shine)`} />
              <path
                d={shapePath}
                fill="none"
                stroke="var(--card-shape-stroke)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <img
              src={info.heroPicUrl}
              alt=""
              decoding="async"
              style={{
                width: 76,
                height: 76,
                objectFit: 'cover',
                display: 'block',
                borderRadius: 999,
                border: '2px solid var(--card-shape-stroke)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.30)',
              }}
            />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <span style={{
            display: 'block',
            color: 'var(--text-primary)',
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            lineHeight: 1.05,
          }}>
            {info.name}
          </span>

          <span style={{
            display: 'block',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            marginTop: 8,
            lineHeight: 1.35,
          }}>
            {info.placeCount} {info.placeCount === 1 ? 'place' : 'places'} visited
          </span>

          {photoUrls.length > 1 && (
            <div style={{ position: 'relative', width: 78, height: 34, marginTop: 11 }}>
              {photoUrls.map((url, i) => (
                <img
                  key={`${url}-${i}`}
                  src={url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{
                    position: 'absolute',
                    left: i * 22,
                    top: 0,
                    width: 34,
                    height: 34,
                    objectFit: 'cover',
                    borderRadius: 999,
                    border: '2px solid var(--card-shape-stroke)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.26)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
