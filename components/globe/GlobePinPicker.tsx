'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';

interface GlobePinPickerProps {
  onPick: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
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

async function loadGlobe() {
  const THREE = await import('three');
  (window as typeof window & { THREE?: typeof THREE }).THREE = THREE;
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

export default function GlobePinPicker({ onPick, initialLat, initialLng }: GlobePinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;
    let globe: any = null;

    loadGlobe().then(({ GlobeGL, THREE }) => {
      if (!mounted || !containerRef.current) return;

      const markers: { lat: number; lng: number }[] = pinRef.current ? [pinRef.current] : [];

      globe = GlobeGL({ rendererConfig: { antialias: true, alpha: true } })(containerRef.current!)
        .width(containerRef.current!.offsetWidth)
        .height(containerRef.current!.offsetHeight)
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(false)
        .globeMaterial(subtleGlobeMaterial(THREE))
        .lights(softAngledLights(THREE))
        .pointOfView({ lat: initialLat ?? 20, lng: initialLng ?? 0, altitude: 2 })
        .htmlElementsData(markers)
        .htmlLat((d: any) => d.lat)
        .htmlLng((d: any) => d.lng)
        .htmlAltitude(0.05)
        .htmlElement(() => {
          const el = document.createElement('div');
          el.style.cssText = [
            'width:16px', 'height:16px', 'border-radius:50%',
            'background:#111827', 'border:2px solid #ffffff',
            'box-shadow:0 10px 24px rgba(15,23,42,0.2)',
          ].join(';');
          return el;
        })
        .onGlobeClick(({ lat, lng }: { lat: number; lng: number }) => {
          pinRef.current = { lat, lng };
          markers.length = 0;
          markers.push({ lat, lng });
          globe.htmlElementsData([...markers]);
          onPick(lat, lng);
        });

      allowCanvasInteractionThroughHtmlLayer(globe);
    });

    return () => {
      mounted = false;
      try { globe?.pauseAnimation?.(); } catch { /* ignore */ }
      try { globe?.htmlElementsData?.([]); } catch { /* ignore */ }
      try { globe?.controls()?.dispose(); } catch { /* ignore */ }
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full bg-white rounded-md overflow-hidden border border-gray-200">
      <div ref={containerRef} className="w-full h-full" />
      <p className="absolute bottom-3 left-0 right-0 text-center text-gray-400 text-xs pointer-events-none">
        Click anywhere on the globe to drop a pin
      </p>
    </div>
  );
}
