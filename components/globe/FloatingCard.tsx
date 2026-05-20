'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { HoverInfo } from './types'
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

  const shapePath = geoJsonToSvgPath(info.geometry, FRAME_VIEW_W, FRAME_VIEW_H, 10)
  const photoUrls = [info.heroPicUrl, ...info.otherPicUrls].slice(0, 3)

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
        background: 'linear-gradient(140deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 36%, rgba(8, 12, 20, 0.78) 100%)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 18,
        boxShadow: '0 18px 60px rgba(0,0,0,0.36)',
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
              <image
                href={info.heroPicUrl}
                x={0}
                y={0}
                width={FRAME_VIEW_W}
                height={FRAME_VIEW_H}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipId})`}
              />
              <path d={shapePath} fill={`url(#${clipId}Shine)`} />
              <path
                d={shapePath}
                fill="none"
                stroke="rgba(248,250,252,0.76)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <img
              src={info.heroPicUrl}
              alt=""
              style={{
                width: 76,
                height: 76,
                objectFit: 'cover',
                display: 'block',
                borderRadius: 999,
                border: '2px solid rgba(248,250,252,0.84)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.30)',
              }}
            />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <span style={{
            display: 'block',
            color: '#F8FAFC',
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            lineHeight: 1.05,
          }}>
            {info.name}
          </span>

          <span style={{
            display: 'block',
            color: '#94A3B8',
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
                  style={{
                    position: 'absolute',
                    left: i * 22,
                    top: 0,
                    width: 34,
                    height: 34,
                    objectFit: 'cover',
                    borderRadius: 999,
                    border: '2px solid rgba(248,250,252,0.88)',
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
