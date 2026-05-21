import type { Feature } from 'geojson'

const featureCache = new Map<string, Feature>()

export function getCachedFeature(code: string): Feature | undefined {
  return featureCache.get(code)
}

export function setCachedFeature(code: string, feature: Feature): void {
  featureCache.set(code, feature)
}

export function hasCachedFeature(code: string): boolean {
  return featureCache.has(code)
}
