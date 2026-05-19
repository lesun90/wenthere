'use client';

import { useEffect, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import type { LightboxPhoto } from '@/components/lightbox/Lightbox';

const Lightbox = dynamic(() => import('@/components/lightbox/Lightbox'), { ssr: false });

interface GalleryOverlayProps {
  countryCode: string;
  regionCode: string | null;
  countryName: string;
  regionName: string | null;
  onClose: () => void;
}

const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ?? '';

function thumbnailUrl(photo: LightboxPhoto): string {
  if (photo.thumbnail_url) return photo.thumbnail_url;
  if (photo.thumbnail_path.startsWith('http')) return photo.thumbnail_path;
  return `${STORAGE_URL}/${photo.thumbnail_path}`;
}

export default function GalleryOverlay({
  countryCode,
  regionCode,
  countryName,
  regionName,
  onClose,
}: GalleryOverlayProps) {
  const [photos, setPhotos] = useState<LightboxPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setPhotos([]);
    const url = `/api/photos?country=${countryCode}${regionCode ? `&region=${regionCode}` : ''}`;
    fetch(url)
      .then(r => r.json())
      .then((data: LightboxPhoto[]) => { setPhotos(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [countryCode, regionCode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Let Lightbox's own ESC handler close it first; gallery closes on the next ESC
      if (lightboxIndex !== null) setLightboxIndex(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
    [onClose]
  );

  const title = regionName ?? countryName;
  const subtitle = regionName ? countryName : null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div className="relative w-full max-w-3xl max-h-[85vh] mx-6 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-950">{title}</h2>
              {subtitle && (
                <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close gallery"
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400
                         hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Photo grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                Loading…
              </div>
            ) : photos.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                No photos found
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    onClick={() => setLightboxIndex(i)}
                    className="aspect-square overflow-hidden rounded-md focus:outline-none
                               focus-visible:ring-2 focus-visible:ring-gray-950"
                  >
                    <img
                      src={thumbnailUrl(photo)}
                      alt={photo.caption ?? ''}
                      className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          countryName={countryName}
          regionName={regionName}
        />
      )}
    </>
  );
}
