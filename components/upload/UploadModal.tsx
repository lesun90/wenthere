'use client';

import { useState, useRef, useCallback } from 'react';
import type { GlobeRegion } from '@/lib/types';
import dynamic from 'next/dynamic';

const GlobePinPicker = dynamic(() => import('@/components/globe/GlobePinPicker'), { ssr: false });

interface UploadModalProps {
  onClose: () => void;
  onComplete: (regions: GlobeRegion[]) => void;
}

interface FileItem {
  file: File;
  status: 'pending' | 'uploading' | 'needs_location' | 'done' | 'error';
  preview: string;
  lat?: number;
  lng?: number;
  caption: string;
}

const STATUS_LABEL: Record<FileItem['status'], string> = {
  pending: '',
  uploading: 'Uploading…',
  needs_location: 'Pin needed',
  done: '✓',
  error: 'Error',
};

export default function UploadModal({ onClose, onComplete }: UploadModalProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [pinTarget, setPinTarget] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const items: FileItem[] = Array.from(incoming)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({ file: f, status: 'pending', preview: URL.createObjectURL(f), caption: '' }));
    setFiles(prev => [...prev, ...items]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const upload = async () => {
    if (!files.length) return;
    setUploading(true);
    const updatedFiles = [...files];
    let finalRegions: GlobeRegion[] = [];

    for (let i = 0; i < updatedFiles.length; i++) {
      const item = updatedFiles[i];
      if (item.status === 'done') continue;

      updatedFiles[i] = { ...item, status: 'uploading' };
      setFiles([...updatedFiles]);

      const form = new FormData();
      form.append('files', item.file);
      if (item.caption) form.append('caption', item.caption);
      if (item.lat != null) form.append('lat', String(item.lat));
      if (item.lng != null) form.append('lng', String(item.lng));

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const data = await res.json();

        if (data.results?.[0]?.needsLocation && item.lat == null) {
          updatedFiles[i] = { ...updatedFiles[i], status: 'needs_location' };
          setFiles([...updatedFiles]);
          setPinTarget(i);
          setUploading(false);
          return;
        }

        updatedFiles[i] = { ...updatedFiles[i], status: 'done' };
        if (data.regions) finalRegions = data.regions;
      } catch {
        updatedFiles[i] = { ...updatedFiles[i], status: 'error' };
      }
      setFiles([...updatedFiles]);
    }

    setUploading(false);
    if (finalRegions.length > 0) onComplete(finalRegions);
    onClose();
  };

  const onPinPicked = (lat: number, lng: number) => {
    if (pinTarget == null) return;
    setFiles(prev => {
      const next = [...prev];
      next[pinTarget] = { ...next[pinTarget], lat, lng, status: 'pending' };
      return next;
    });
    setPinTarget(null);
  };

  const pendingCount = files.filter(f => f.status !== 'done').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-md ring-1 ring-gray-200 shadow-[0_24px_80px_rgba(15,23,42,0.08)] w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-900">Add Photos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">×</button>
        </div>

        {/* Pin picker */}
        {pinTarget != null ? (
          <div className="flex flex-col gap-4 p-6 flex-1">
            <p className="text-xs text-gray-500">
              No GPS in <span className="font-medium text-gray-900">{files[pinTarget]?.file.name}</span>. Drop a pin where it was taken.
            </p>
            <div className="h-64 rounded-md overflow-hidden">
              <GlobePinPicker onPick={onPinPicked} />
            </div>
            <button
              onClick={() => {
                setFiles(prev => {
                  const next = [...prev];
                  next[pinTarget] = { ...next[pinTarget], status: 'done' };
                  return next;
                });
                setPinTarget(null);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 text-center transition-colors"
            >
              Skip this photo
            </button>
          </div>
        ) : (
          <>
            {files.length === 0 ? (
              <div
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="m-6 border border-dashed border-gray-200 rounded-md
                           flex flex-col items-center justify-center gap-2 py-12 cursor-pointer
                           hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl text-gray-300">+</span>
                <p className="text-xs text-gray-400">Drop photos or click to browse</p>
                <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
                       onChange={e => addFiles(e.target.files)} />
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                {files.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-6 py-3">
                    <img src={item.preview} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900 truncate font-medium">{item.file.name}</p>
                      <input
                        type="text"
                        placeholder="Add a caption…"
                        value={item.caption}
                        onChange={e => {
                          const next = [...files];
                          next[i] = { ...next[i], caption: e.target.value };
                          setFiles(next);
                        }}
                        className="mt-1.5 w-full text-xs border border-gray-200 rounded px-2 py-1
                                   text-gray-900 placeholder-gray-300 focus:outline-none
                                   focus:ring-1 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                    <span className={`text-xs shrink-0 mt-1 ${
                      item.status === 'done' ? 'text-green-500' :
                      item.status === 'error' ? 'text-red-400' :
                      item.status === 'uploading' ? 'text-gray-400 animate-pulse' :
                      'text-gray-400'
                    }`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => inputRef.current?.click()}
                  className="w-full px-6 py-3 text-xs text-gray-400 hover:text-gray-600 text-left transition-colors"
                >
                  + Add more photos
                  <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
                         onChange={e => addFiles(e.target.files)} />
                </button>
              </div>
            )}

            {files.length > 0 && (
              <div className="px-6 py-5 border-t border-gray-200">
                <button
                  onClick={upload}
                  disabled={uploading || pendingCount === 0}
                  className="w-full py-2.5 bg-gray-950 text-white rounded-md text-sm font-medium
                             hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  {uploading ? 'Uploading…' : `Upload ${pendingCount} photo${pendingCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
