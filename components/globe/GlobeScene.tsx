'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { GlobeRegion } from '@/lib/types';
import GlobeView from './Globe';

const GalleryOverlay = dynamic(() => import('./GalleryOverlay'), { ssr: false });
const UploadModal = dynamic(() => import('@/components/upload/UploadModal'), { ssr: false });

interface GlobeSceneProps {
  regions: GlobeRegion[];
  username: string;
  isOwner: boolean;
}

interface GalleryState {
  countryCode: string;
  regionCode: string | null;
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
  const [gallery, setGallery] = useState<GalleryState | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRegionClick = useCallback((countryCode: string, regionCode: string | null) => {
    const countryName = regions.find(r => r.country_code === countryCode)?.country_name ?? countryCode;
    const regionName = regionCode
      ? regions.find(r => r.country_code === countryCode && r.region_code === regionCode)?.region_name ?? null
      : null;
    setGallery({ countryCode, regionCode, countryName, regionName });
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

      {/* Globe */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0">
          <GlobeView
            regions={regions}
            onRegionClick={handleRegionClick}
            onUploadRequest={isOwner ? () => setUploadOpen(true) : undefined}
            isOwner={isOwner}
          />
        </div>
      </div>

      {gallery && (
        <GalleryOverlay
          {...gallery}
          onClose={() => setGallery(null)}
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
