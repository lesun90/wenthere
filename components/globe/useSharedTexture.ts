import { useEffect, useState } from 'react'
import * as THREE from 'three'

export const FALLBACK_COLOR = '#C8874A'

type SharedTextureEntry =
  | { status: 'idle'; texture: null; listeners: Set<() => void>; promise: null }
  | { status: 'loading'; texture: null; listeners: Set<() => void>; promise: Promise<void> }
  | { status: 'ready'; texture: THREE.Texture; listeners: Set<() => void>; promise: null }
  | { status: 'failed'; texture: null; listeners: Set<() => void>; promise: null }

export type SharedTextureState =
  | { status: 'idle'; texture: null }
  | { status: 'loading'; texture: null }
  | { status: 'ready'; texture: THREE.Texture }
  | { status: 'failed'; texture: null }

const textureCache = new Map<string, SharedTextureEntry>()
const loader = new THREE.TextureLoader()

function getEntry(url: string): SharedTextureEntry {
  let entry = textureCache.get(url)
  if (!entry) {
    entry = { status: 'idle', texture: null, listeners: new Set(), promise: null }
    textureCache.set(url, entry)
  }
  return entry
}

function snapshot(entry: SharedTextureEntry): SharedTextureState {
  if (entry.status === 'ready') return { status: 'ready', texture: entry.texture }
  return { status: entry.status, texture: null }
}

function notify(entry: SharedTextureEntry) {
  for (const listener of entry.listeners) listener()
}

export function preloadSharedTexture(url?: string) {
  if (!url) return

  const entry = getEntry(url)
  if (entry.status !== 'idle') return

  const loadingEntry: SharedTextureEntry = {
    status: 'loading',
    texture: null,
    listeners: entry.listeners,
    promise: null as unknown as Promise<void>,
  }
  textureCache.set(url, loadingEntry)

  loadingEntry.promise = new Promise<void>((resolve) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        textureCache.set(url, {
          status: 'ready',
          texture,
          listeners: loadingEntry.listeners,
          promise: null,
        })
        notify(textureCache.get(url)!)
        resolve()
      },
      undefined,
      () => {
        textureCache.set(url, {
          status: 'failed',
          texture: null,
          listeners: loadingEntry.listeners,
          promise: null,
        })
        notify(textureCache.get(url)!)
        resolve()
      },
    )
  })

  notify(loadingEntry)
}

export function useSharedTexture(url?: string): SharedTextureState {
  const [state, setState] = useState<SharedTextureState>(() => (
    url ? snapshot(getEntry(url)) : { status: 'idle', texture: null }
  ))

  useEffect(() => {
    if (!url) {
      setState({ status: 'idle', texture: null })
      return
    }

    const entry = getEntry(url)
    function update() {
      setState(snapshot(getEntry(url!)))
    }

    entry.listeners.add(update)
    setState(snapshot(entry))
    preloadSharedTexture(url)

    return () => {
      getEntry(url).listeners.delete(update)
    }
  }, [url])

  return state
}
