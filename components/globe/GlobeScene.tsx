'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { GlobeRegion } from '@/lib/types';
import type { LightboxPhoto } from '@/components/lightbox/Lightbox';
import GlobeView from './Globe';
import type { GlobeHandle } from './Globe';

const Lightbox = dynamic(() => import('@/components/lightbox/Lightbox'), { ssr: false });
const UploadModal = dynamic(() => import('@/components/upload/UploadModal'), { ssr: false });

interface GlobeSceneProps {
  regions: GlobeRegion[];
  username: string;
  isOwner: boolean;
}

interface LightboxState {
  photos: LightboxPhoto[];
  index: number;
  countryName: string;
  regionName: string | null;
}

function Wordmark({ href }: { href: string }) {
  return (
    <a href={href} className="flex items-baseline tracking-logotype uppercase text-sm select-none">
      <span className="font-light text-gray-900">went</span>
      <span className="font-semibold text-gray-900">here</span>
    </a>
  );
}

export default function GlobeScene({ regions: initialRegions, username, isOwner }: GlobeSceneProps) {
  const [regions, setRegions] = useState<GlobeRegion[]>(initialRegions);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'country' | 'region'>('country');
  const globeRef = useRef<GlobeHandle>(null);

  const handleRegionClick = useCallback(async (countryCode: string, regionCode: string | null) => {
    const res = await fetch(
      `/api/photos?country=${countryCode}${regionCode ? `&region=${regionCode}` : ''}`
    );
    if (!res.ok) return;
    const photos: LightboxPhoto[] = await res.json();
    if (!photos.length) return;

    const countryName = regions.find(r => r.country_code === countryCode)?.country_name ?? countryCode;
    const regionName = regionCode
      ? regions.find(r => r.country_code === countryCode && r.region_code === regionCode)?.region_name ?? null
      : null;

    setLightbox({ photos, index: 0, countryName, regionName });
  }, [regions]);

  const handleUploadComplete = useCallback((updatedRegions: GlobeRegion[]) => {
    setRegions(updatedRegions);
  }, []);

  const copyShareLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/${username}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = `/${username}`;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white text-gray-950">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-8 py-5 bg-white/95 border-b border-gray-200 z-10">
        <Wordmark href={`/${username}`} />

        <div className="flex items-center gap-5">
          {isOwner && (
            <a href={`/${username}`} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
              Public view
            </a>
          )}
          <button
            onClick={copyShareLink}
            className="text-xs px-3.5 py-2 rounded-md border border-gray-200 text-gray-600
                       hover:border-gray-300 hover:text-gray-950 hover:bg-gray-50 transition-colors"
          >
            {copied ? 'Copied!' : 'Share'}
          </button>
          {isOwner && (
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
              Sign out
            </button>
          )}
        </div>
      </header>

      {/* Globe — absolute fill ensures correct canvas dimensions */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <GlobeView
            ref={globeRef}
            regions={regions}
            onRegionClick={handleRegionClick}
            onUploadRequest={isOwner ? () => setUploadOpen(true) : undefined}
            onZoomChange={setZoomLevel}
            isOwner={isOwner}
          />
        </div>
        {zoomLevel === 'region' && (
          <button
            onClick={() => globeRef.current?.resetToWorld()}
            className="absolute top-5 left-6 flex items-center gap-1.5 px-3.5 py-2 rounded-md
                       bg-white/90 backdrop-blur-sm text-gray-600 border border-gray-200 text-xs
                       hover:bg-white hover:text-gray-950 transition-colors z-10"
          >
            ← World
          </button>
        )}
      </div>

      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          countryName={lightbox.countryName}
          regionName={lightbox.regionName}
        />
      )}

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
