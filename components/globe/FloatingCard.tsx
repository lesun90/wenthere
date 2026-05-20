'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { HoverInfo } from './types'
import { geoJsonToSvgPath } from '../../lib/geomath'

const FRAME_VIEW_W = 200
const FRAME_VIEW_H = 140
const CARD_WIDTH = 216
const CARD_HEIGHT_EST = 270
const CURSOR_OFFSET_X = 20
const CURSOR_OFFSET_Y = -CARD_HEIGHT_EST / 2

interface Props {
  info: HoverInfo
  viewportWidth: number
  viewportHeight: number
}

export function FloatingCard({ info, viewportWidth, viewportHeight }: Props) {
  const [visible, setVisible] = useState(false)
  const [mousePos, setMousePos] = useState({ x: info.screenX, y: info.screenY })
  const prevNameRef = useRef<string | null>(null)
  const rawId = useId()
  const clipId = `clip${rawId.replace(/:/g, '')}`

  useEffect(() => {
    function onMove(e: MouseEvent) {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

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

  let left = mousePos.x + CURSOR_OFFSET_X
  let top = mousePos.y + CURSOR_OFFSET_Y

  if (left + CARD_WIDTH > viewportWidth - 8) left = mousePos.x - CARD_WIDTH - CURSOR_OFFSET_X
  if (top + CARD_HEIGHT_EST > viewportHeight - 8) top = viewportHeight - CARD_HEIGHT_EST - 8
  if (top < 8) top = 8

  const shapePath = geoJsonToSvgPath(info.geometry, FRAME_VIEW_W, FRAME_VIEW_H)

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: CARD_WIDTH,
        pointerEvents: 'none',
        zIndex: 30,
        opacity: visible ? 1 : 0,
        transition: visible ? 'opacity 150ms ease-out' : 'opacity 100ms ease-in',
        background: 'rgba(8, 12, 20, 0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {shapePath ? (
        <svg
          viewBox={`0 0 ${FRAME_VIEW_W} ${FRAME_VIEW_H}`}
          width="100%"
          style={{ display: 'block', flexShrink: 0 }}
          aria-hidden="true"
        >
          <defs>
            <clipPath id={clipId}>
              <path d={shapePath} />
            </clipPath>
          </defs>
          <image
            href={info.heroPicUrl}
            x={0}
            y={0}
            width={FRAME_VIEW_W}
            height={FRAME_VIEW_H}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
          <path
            d={shapePath}
            fill="none"
            stroke="rgba(255,255,255,0.30)"
            strokeWidth="1"
          />
        </svg>
      ) : (
        <img
          src={info.heroPicUrl}
          alt={info.name}
          style={{ width: '100%', height: FRAME_VIEW_H, objectFit: 'cover', display: 'block', flexShrink: 0 }}
        />
      )}

      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{
          color: '#F8FAFC',
          fontSize: 14,
          fontWeight: 500,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          lineHeight: 1.3,
        }}>
          {info.name}
        </span>

        {info.otherPicUrls.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {info.otherPicUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                style={{ width: 36, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
              />
            ))}
          </div>
        )}

        <span style={{
          color: '#94A3B8',
          fontSize: 12,
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}>
          {info.placeCount} {info.placeCount === 1 ? 'place' : 'places'} visited
        </span>
      </div>
    </div>
  )
}
