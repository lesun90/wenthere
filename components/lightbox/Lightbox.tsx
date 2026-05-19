'use client';

import { useEffect, useCallback, useState } from 'react';

export interface LightboxPhoto {
  id: string;
  thumbnail_path: string;
  thumbnail_url?: string;
  storage_path: string;
  original_url?: string;
  taken_at: string | null;
  caption: string | null;
  country_name: string | null;
  region_name: string | null;
  is_hero: boolean;
}

interface LightboxProps {
  photos: LightboxPhoto[];
  initialIndex?: number;
  onClose: () => void;
  countryName: string;
  regionName: string | null;
}

const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ?? '';

function photoUrl(photo: LightboxPhoto): string {
  if (photo.thumbnail_url) return photo.thumbnail_url;
  if (photo.thumbnail_path.startsWith('http')) return photo.thumbnail_path;
  return `${STORAGE_URL}/${photo.thumbnail_path}`;
}

export default function Lightbox({ photos, initialIndex = 0, onClose, countryName, regionName }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex(i => Math.min(photos.length - 1, i + 1)), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, onClose]);

  useEffect(() => {
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [prev, next]);

  const formattedDate = photo?.taken_at
    ? new Date(photo.taken_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const location = [regionName, countryName].filter(Boolean).join(', ');

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 shrink-0">
        <span className="text-gray-400 text-xs tracking-wide uppercase">{location}</span>
        <div className="flex items-center gap-4 text-gray-400 text-xs">
          <span>{index + 1} / {photos.length}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-950 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center px-14 min-h-0 relative">
        <button
          onClick={prev}
          disabled={index === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                     text-gray-300 hover:text-gray-950 disabled:opacity-0 text-2xl transition-colors"
        >
          ‹
        </button>

        {photo && (
          <img
            key={photo.id}
            src={photoUrl(photo)}
            alt={photo.caption ?? `Photo ${index + 1}`}
            className="max-h-[76vh] max-w-full object-contain shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
          />
        )}

        <button
          onClick={next}
          disabled={index === photos.length - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                     text-gray-300 hover:text-gray-950 disabled:opacity-0 text-2xl transition-colors"
        >
          ›
        </button>
      </div>

      {/* Caption + date */}
      {(photo?.caption || formattedDate) && (
        <div className="text-center px-6 py-2 shrink-0">
          {photo.caption && (
            <p className="text-gray-900 text-sm">{photo.caption}</p>
          )}
          {formattedDate && (
            <p className="text-gray-400 text-xs mt-1">{formattedDate}</p>
          )}
        </div>
      )}

      {/* Filmstrip */}
      <div className="flex gap-1.5 px-4 py-3 overflow-x-auto shrink-0">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIndex(i)}
            className={`shrink-0 w-14 h-14 rounded overflow-hidden transition-all ${
              i === index
                ? 'ring-1 ring-gray-950 opacity-100'
                : 'opacity-35 hover:opacity-70'
            }`}
          >
            <img src={photoUrl(p)} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
