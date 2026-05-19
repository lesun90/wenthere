'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { GlobeRegion } from '@/lib/types';

interface GlobeProps {
  regions: GlobeRegion[];
  onRegionClick: (countryCode: string, regionCode: string | null) => void;
  onUploadRequest?: () => void;
  onZoomChange?: (level: 'country' | 'region') => void;
  isOwner?: boolean;
}

export interface GlobeHandle {
  resetToWorld: () => void;
}

const DRAG_CLICK_THRESHOLD_PX = 4;

function flattenCoords(geometry: any): [number, number][] {
  switch (geometry.type) {
    case 'Point': return [geometry.coordinates];
    case 'MultiPoint':
    case 'LineString': return geometry.coordinates;
    case 'MultiLineString':
    case 'Polygon': return geometry.coordinates.flat();
    case 'MultiPolygon': return geometry.coordinates.flat(2);
    case 'GeometryCollection': return geometry.geometries.flatMap(flattenCoords);
    default: return [];
  }
}

function centroidFromFeature(feat: any): { lat: number; lng: number } {
  const coords = flattenCoords(feat.geometry);
  if (!coords.length) return { lat: 0, lng: 0 };
  return {
    lng: coords.reduce((s, c) => s + c[0], 0) / coords.length,
    lat: coords.reduce((s, c) => s + c[1], 0) / coords.length,
  };
}

function hasValidCoords(
  region: GlobeRegion & { lat?: number; lng?: number }
): region is GlobeRegion & { lat: number; lng: number } {
  return Number.isFinite(region.lat) && Number.isFinite(region.lng);
}

function allowCanvasInteractionThroughHtmlLayer(globe: any): void {
  const canvas = globe.renderer?.().domElement as HTMLElement | undefined;
  const renderRoot = canvas?.parentElement;
  if (!renderRoot) return;

  Array.from(renderRoot.children).forEach(child => {
    if (child instanceof HTMLElement && child !== canvas) {
      child.style.pointerEvents = 'none';
    }
  });
}

function forwardPointerDragToCanvas(el: HTMLElement, globe: any): () => boolean {
  const canvas = globe.renderer?.().domElement as HTMLElement | undefined;
  if (!canvas) return () => false;

  let dragging = false;
  let dragged = false;
  let startX = 0;
  let startY = 0;

  const forward = (event: PointerEvent) => {
    canvas.dispatchEvent(new PointerEvent(event.type, event));
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > DRAG_CLICK_THRESHOLD_PX) {
      dragged = true;
    }
    forward(event);
  };

  const stopForwarding = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    forward(event);
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('pointerup', stopForwarding, true);
    window.removeEventListener('pointercancel', stopForwarding, true);
    window.setTimeout(() => { dragged = false; }, 0);
  };

  el.addEventListener('pointerdown', (event) => {
    dragging = true;
    dragged = false;
    startX = event.clientX;
    startY = event.clientY;
    forward(event);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', stopForwarding, true);
    window.addEventListener('pointercancel', stopForwarding, true);
  });

  return () => dragged;
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

function softAngledLights(THREE: any): any[] {
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.75);
  keyLight.position.set(-2.5, 1.2, 3);
  return [
    new THREE.AmbientLight(0xf3f6f8, 1.15),
    keyLight,
  ];
}

function subtleGlobeMaterial(THREE: any): any {
  return new THREE.MeshPhongMaterial({
    color: '#e3edf2',
    shininess: 5,
    specular: '#cbd5dc',
  });
}

const GlobeView = forwardRef<GlobeHandle, GlobeProps>(function GlobeView(
  { regions, onRegionClick, onUploadRequest, onZoomChange, isOwner },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const regionsGeoRef = useRef<any>(null);

  const applyCountryLayer = useCallback(
    (globe: any, THREE: any, countriesGeo: any) => {
      const countryRegions = new Map(
        regions.filter(r => !r.region_code).map(r => [r.country_code, r])
      );

      const centroids = new Map<string, { lat: number; lng: number }>();
      countriesGeo.features.forEach((feat: any) => {
        const code = feat.properties.ISO_A2;
        if (countryRegions.has(code)) centroids.set(code, centroidFromFeature(feat));
      });

      const textureLoader = new THREE.TextureLoader();
      const textures = new Map<string, any>();
      countryRegions.forEach((r, code) => {
        if (r.hero_thumbnail_url) textures.set(code, textureLoader.load(r.hero_thumbnail_url));
      });

      const badgeData = regions
        .filter(r => !r.region_code && r.hero_thumbnail_url)
        .map(r => ({ ...r, ...centroids.get(r.country_code) }))
        .filter(hasValidCoords);

      globe
        .polygonsData(countriesGeo.features)
        .polygonAltitude((feat: any) =>
          countryRegions.has(feat.properties.ISO_A2) ? 0.015 : 0.008
        )
        .polygonCapMaterial((feat: any) => {
          const code = feat.properties.ISO_A2;
          const texture = textures.get(code);
          const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
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
          if (countryRegions.has(feat.properties.ISO_A2)) zoomToCountry(feat.properties.ISO_A2);
        })
        .htmlElementsData(badgeData)
        .htmlLat((d: any) => d.lat)
        .htmlLng((d: any) => d.lng)
        .htmlAltitude(0.12)
        .htmlElement((d: any) => {
          const el = document.createElement('div');
          el.style.cssText = [
            'width:40px', 'height:40px', 'border-radius:50%',
            `background-image:url(${d.hero_thumbnail_url})`,
            'background-size:cover', 'background-position:center',
            'border:2px solid rgba(255,255,255,0.98)',
            'box-shadow:0 14px 34px rgba(15,23,42,0.14)',
            'cursor:pointer', 'pointer-events:auto', 'transition:transform 0.15s ease',
          ].join(';');
          const wasDragged = forwardPointerDragToCanvas(el, globe);
          el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.18)'; });
          el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (wasDragged()) return;
            onRegionClick(d.country_code, null);
          });
          return el;
        });
    },
    [regions, onRegionClick]
  );

  const zoomToCountry = useCallback(async (countryCode: string) => {
    if (!globeRef.current) return;
    onZoomChange?.('region');

    if (!regionsGeoRef.current) {
      regionsGeoRef.current = await fetch('/geojson/regions.json').then(r => r.json());
    }

    const countryFeatures = regionsGeoRef.current.features.filter(
      (f: any) => f.properties.iso_a2?.toUpperCase() === countryCode.toUpperCase()
    );

    const regionRegions = new Map(
      regions
        .filter(r => r.country_code === countryCode && r.region_code)
        .map(r => [r.region_code!, r])
    );

    const THREE = await loadThree();

    globeRef.current
      .polygonsData(countryFeatures)
      .polygonAltitude((feat: any) =>
        regionRegions.has(feat.properties.iso_3166_2) ? 0.015 : 0.008
      )
      .polygonCapMaterial((feat: any) => {
        const region = regionRegions.get(feat.properties.iso_3166_2);
        const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
        if (region?.hero_thumbnail_url) {
          mat.map = new THREE.TextureLoader().load(region.hero_thumbnail_url);
        } else {
          mat.color.set(regionRegions.size > 0 ? '#dce7e1' : '#f3f6f4');
        }
        return mat;
      })
      .polygonLabel((feat: any) => {
        const region = regionRegions.get(feat.properties.iso_3166_2);
        if (!region) return '';
        return `<div style="background:rgba(255,255,255,0.96);color:#111827;padding:6px 11px;border-radius:6px;font-family:system-ui,sans-serif;font-size:12px;border:1px solid rgba(148,163,184,0.32);box-shadow:0 12px 32px rgba(15,23,42,0.08)">
          <strong>${feat.properties.name}</strong> &middot; <span style="color:#6b7280">${region.photo_count} photo${region.photo_count !== 1 ? 's' : ''}</span>
        </div>`;
      })
      .onPolygonClick((feat: any) => {
        const code = feat.properties.iso_3166_2;
        if (regionRegions.has(code)) onRegionClick(countryCode, code);
      })
      .htmlElementsData([]);

    const centroid = centroidFromFeature({
      geometry: { type: 'GeometryCollection', geometries: countryFeatures.map((f: any) => f.geometry) },
    });
    globeRef.current.pointOfView({ lat: centroid.lat, lng: centroid.lng, altitude: 0.6 }, 1000);
  }, [regions, onRegionClick, onZoomChange]);

  const resetToWorld = useCallback(async () => {
    if (!globeRef.current) return;
    onZoomChange?.('country');
    const [THREE, countriesGeo] = await Promise.all([
      loadThree(),
      fetch('/geojson/countries.json').then(r => r.json()),
    ]);
    applyCountryLayer(globeRef.current, THREE, countriesGeo);
    globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
  }, [applyCountryLayer, onZoomChange]);

  useImperativeHandle(ref, () => ({ resetToWorld }), [resetToWorld]);

  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;
    let globe: any = null;

    Promise.all([
      loadGlobe(),
      fetch('/geojson/countries.json').then(r => r.json()),
    ]).then(([{ GlobeGL, THREE }, countriesGeo]) => {
      if (!mounted || !containerRef.current) return;

      globe = GlobeGL({ rendererConfig: { antialias: true } })(containerRef.current!)
        .width(containerRef.current!.offsetWidth)
        .height(containerRef.current!.offsetHeight)
        .backgroundColor('#ffffff')
        .showAtmosphere(false)
        .globeMaterial(subtleGlobeMaterial(THREE))
        .lights(softAngledLights(THREE))
        .pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

      allowCanvasInteractionThroughHtmlLayer(globe);
      globeRef.current = globe;
      applyCountryLayer(globe, THREE, countriesGeo);
    });

    return () => {
      mounted = false;
      // Stop Globe.gl work before removing DOM nodes; disposing the renderer
      // loses the WebGL context and blocks StrictMode re-initialization.
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
});

export default GlobeView;
