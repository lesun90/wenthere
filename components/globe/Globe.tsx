'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback } from 'react';
import type { GlobeRegion } from '@/lib/types';

interface GlobeProps {
  regions: GlobeRegion[];
  onRegionClick: (countryCode: string, regionCode: string | null) => void;
  onUploadRequest?: () => void;
  isOwner?: boolean;
}

// Altitude thresholds for automatic layer switching (hysteresis band prevents oscillation)
const ZOOM_IN_THRESHOLD = 0.8;
const ZOOM_OUT_THRESHOLD = 1.2;

function pointInRings(lng: number, lat: number, rings: number[][][]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
  }
  return inside;
}

function countryCodeAtPoint(lng: number, lat: number, features: any[]): string | null {
  for (const feat of features) {
    const code = feat.properties.ISO_A2 as string;
    if (!code || code === '-99') continue;
    const { type, coordinates } = feat.geometry;
    let hit = false;
    if (type === 'Polygon') {
      hit = pointInRings(lng, lat, coordinates);
    } else if (type === 'MultiPolygon') {
      hit = coordinates.some((poly: number[][][]) => pointInRings(lng, lat, poly));
    }
    if (hit) return code;
  }
  return null;
}

async function loadThree() {
  const THREE = await import('three');
  (window as typeof window & { THREE?: typeof THREE }).THREE = THREE;
  return THREE;
}

async function loadGlobe() {
  const THREE = await loadThree();
  const GlobeGL = (await import('globe.gl')).default as any;
  return { GlobeGL, THREE };
}

function subtleGlobeMaterial(THREE: any): any {
  // MeshBasicMaterial renders at full brightness regardless of Three.js lighting mode,
  // which changed to physical units in r155 and made legacy intensity values near-black.
  return new THREE.MeshBasicMaterial({ color: '#dde8ee' });
}

export default function GlobeView({ regions, onRegionClick, onUploadRequest, isOwner }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const countriesGeoRef = useRef<any>(null);
  const regionsGeoRef = useRef<any>(null);
  const regionsRef = useRef<GlobeRegion[]>(regions);
  const onRegionClickRef = useRef(onRegionClick);
  const zoomLayerRef = useRef<'country' | 'region'>('country');
  const activeCountryRef = useRef<string | null>(null);

  useEffect(() => { regionsRef.current = regions; }, [regions]);
  useEffect(() => { onRegionClickRef.current = onRegionClick; }, [onRegionClick]);

  const applyCountryLayer = useCallback((globe: any, THREE: any, countriesGeo: any) => {
    zoomLayerRef.current = 'country';
    activeCountryRef.current = null;

    const currentRegions = regionsRef.current;
    const countryRegions = new Map(
      currentRegions.filter(r => !r.region_code).map(r => [r.country_code, r])
    );

    const textureLoader = new THREE.TextureLoader();
    const textures = new Map<string, any>();
    countryRegions.forEach((r, code) => {
      if (r.hero_thumbnail_url) textures.set(code, textureLoader.load(r.hero_thumbnail_url));
    });

    globe
      .polygonsData(countriesGeo.features)
      .polygonAltitude((feat: any) =>
        countryRegions.has(feat.properties.ISO_A2) ? 0.015 : 0.008
      )
      .polygonCapMaterial((feat: any) => {
        const code = feat.properties.ISO_A2;
        const texture = textures.get(code);
        const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        if (texture) mat.map = texture;
        else mat.color.set(countryRegions.has(code) ? '#d8e3dd' : '#f3f6f4');
        return mat;
      })
      .polygonSideColor(() => '#e5ebe7')
      .polygonStrokeColor(() => '#cfd8d2')
      .polygonLabel((feat: any) => {
        const region = countryRegions.get(feat.properties.ISO_A2);
        if (!region) return '';
        return `<div style="background:rgba(255,255,255,0.96);color:#111827;padding:6px 11px;border-radius:6px;font-family:system-ui,sans-serif;font-size:12px;border:1px solid rgba(148,163,184,0.32);box-shadow:0 12px 32px rgba(15,23,42,0.08)">
          <strong>${feat.properties.NAME}</strong> &middot; <span style="color:#6b7280">${region.photo_count} photo${region.photo_count !== 1 ? 's' : ''}</span>
        </div>`;
      })
      .onPolygonClick((feat: any) => {
        const code = feat.properties.ISO_A2;
        if (countryRegions.has(code)) onRegionClickRef.current(code, null);
      })
      .htmlElementsData([]);
  }, []);

  const activateRegionLayer = useCallback(async (countryCode: string) => {
    const globe = globeRef.current;
    if (!globe) return;
    zoomLayerRef.current = 'region';
    activeCountryRef.current = countryCode;

    if (!regionsGeoRef.current) {
      regionsGeoRef.current = await fetch('/geojson/regions.json').then(r => r.json());
    }

    // Bail if user zoomed back out while the fetch was in progress
    if (zoomLayerRef.current !== 'region') return;

    const countryFeatures = regionsGeoRef.current.features.filter(
      (f: any) => f.properties.iso_a2?.toUpperCase() === countryCode.toUpperCase()
    );

    const currentRegions = regionsRef.current;
    const regionRegions = new Map(
      currentRegions
        .filter(r => r.country_code === countryCode && r.region_code)
        .map(r => [r.region_code!, r])
    );

    const THREE = await loadThree();

    globe
      .polygonsData(countryFeatures)
      .polygonAltitude((feat: any) =>
        regionRegions.has(feat.properties.iso_3166_2) ? 0.015 : 0.008
      )
      .polygonCapMaterial((feat: any) => {
        const region = regionRegions.get(feat.properties.iso_3166_2);
        const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        if (region?.hero_thumbnail_url) {
          mat.map = new THREE.TextureLoader().load(region.hero_thumbnail_url);
        } else {
          mat.color.set(regionRegions.size > 0 ? '#dce7e1' : '#f3f6f4');
        }
        return mat;
      })
      .polygonSideColor(() => '#e5ebe7')
      .polygonStrokeColor(() => '#cfd8d2')
      .polygonLabel((feat: any) => {
        const region = regionRegions.get(feat.properties.iso_3166_2);
        if (!region) return '';
        return `<div style="background:rgba(255,255,255,0.96);color:#111827;padding:6px 11px;border-radius:6px;font-family:system-ui,sans-serif;font-size:12px;border:1px solid rgba(148,163,184,0.32);box-shadow:0 12px 32px rgba(15,23,42,0.08)">
          <strong>${feat.properties.name}</strong> &middot; <span style="color:#6b7280">${region.photo_count} photo${region.photo_count !== 1 ? 's' : ''}</span>
        </div>`;
      })
      .onPolygonClick((feat: any) => {
        const code = feat.properties.iso_3166_2;
        if (regionRegions.has(code)) onRegionClickRef.current(countryCode, code);
      })
      .htmlElementsData([]);
  }, []);

  const activateCountryLayer = useCallback(async () => {
    const globe = globeRef.current;
    if (!globe || !countriesGeoRef.current) return;
    zoomLayerRef.current = 'country';
    activeCountryRef.current = null;
    const THREE = await loadThree();
    applyCountryLayer(globe, THREE, countriesGeoRef.current);
  }, [applyCountryLayer]);

  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;
    let globe: any = null;
    let removeControlsListener: (() => void) | null = null;

    Promise.all([
      loadGlobe(),
      fetch('/geojson/countries.json').then(r => r.json()),
    ]).then(([{ GlobeGL, THREE }, countriesGeo]) => {
      if (!mounted || !containerRef.current) return;

      countriesGeoRef.current = countriesGeo;

      globe = GlobeGL({ rendererConfig: { antialias: true } })(containerRef.current!)
        .width(containerRef.current!.offsetWidth)
        .height(containerRef.current!.offsetHeight)
        .backgroundColor('#ffffff')
        .showAtmosphere(false)
        .globeMaterial(subtleGlobeMaterial(THREE))
        .pointOfView({ lat: 20, lng: 0, altitude: 2.5 })
        .htmlElementsData([]);

      globeRef.current = globe;
      applyCountryLayer(globe, THREE, countriesGeo);

      const controls = globe.controls();
      let debounce: ReturnType<typeof setTimeout> | null = null;

      const onControlsChange = () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
          const pov = globe.pointOfView();
          if (!pov) return;
          const { altitude, lat, lng } = pov;

          if (altitude < ZOOM_IN_THRESHOLD && zoomLayerRef.current === 'country') {
            const code = countryCodeAtPoint(lng, lat, countriesGeoRef.current.features);
            if (!code) return;
            const hasRegions = regionsRef.current.some(
              r => r.country_code === code && r.region_code
            );
            if (hasRegions) activateRegionLayer(code);
          } else if (altitude > ZOOM_OUT_THRESHOLD && zoomLayerRef.current === 'region') {
            activateCountryLayer();
          }
        }, 300);
      };

      controls.addEventListener('change', onControlsChange);
      removeControlsListener = () => controls.removeEventListener('change', onControlsChange);
    });

    return () => {
      mounted = false;
      removeControlsListener?.();
      try { globe?.pauseAnimation?.(); } catch { /* ignore */ }
      try { globe?.htmlElementsData?.([]); } catch { /* ignore */ }
      try { globe?.controls()?.dispose(); } catch { /* ignore */ }
      if (containerRef.current) containerRef.current.innerHTML = '';
      globeRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (globeRef.current && containerRef.current) {
        globeRef.current
          .width(containerRef.current.offsetWidth)
          .height(containerRef.current.offsetHeight);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative w-full h-full bg-white">
      <div ref={containerRef} className="w-full h-full" />
      {isOwner && onUploadRequest && (
        <button
          onClick={onUploadRequest}
          className="absolute bottom-8 right-8 flex items-center gap-2 px-4 py-2.5
                     bg-white text-gray-950 rounded-md text-sm font-medium
                     border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          + Add Photos
        </button>
      )}
    </div>
  );
}
