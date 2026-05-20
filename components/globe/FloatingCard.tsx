'use client'

import { useEffect, useRef, useState } from 'react'
import type { HoverInfo } from './types'

const CARD_WIDTH = 200
const CARD_HEIGHT = 160

interface Props {
  info: HoverInfo
  viewportWidth: number
  viewportHeight: number
}

export function FloatingCard({ info, viewportWidth, viewportHeight }: Props) {
  const [visible, setVisible] = useState(false)
  const prevNameRef = useRef<string | null>(null)

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

  let left = info.screenX + 16
  let top = info.screenY - CARD_HEIGHT / 2

  if (left + CARD_WIDTH > viewportWidth - 8) left = info.screenX - CARD_WIDTH - 16
  if (top + CARD_HEIGHT > viewportHeight - 8) top = viewportHeight - CARD_HEIGHT - 8
  if (top < 8) top = 8

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
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <img
        src={info.heroPicUrl}
        alt={info.name}
        style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, display: 'block' }}
      />
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
  )
}
