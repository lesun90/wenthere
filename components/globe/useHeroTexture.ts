import { useEffect, useState } from 'react'
import * as THREE from 'three'

export const FALLBACK_COLOR = '#C8874A'

export function useHeroTexture(heroPicUrl?: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [textureFailed, setTextureFailed] = useState(false)

  useEffect(() => {
    if (!heroPicUrl) {
      setTexture(null)
      setTextureFailed(false)
      return
    }

    setTexture(null)
    setTextureFailed(false)

    const loader = new THREE.TextureLoader()
    let cancelled = false

    loader.load(
      heroPicUrl,
      (loadedTexture) => { if (!cancelled) setTexture(loadedTexture) },
      undefined,
      () => { if (!cancelled) setTextureFailed(true) },
    )

    return () => {
      cancelled = true
    }
  }, [heroPicUrl])

  useEffect(() => {
    return () => { texture?.dispose() }
  }, [texture])

  return { texture, textureFailed }
}
