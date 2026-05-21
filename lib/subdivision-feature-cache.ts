import type { Feature } from 'geojson'

// null = fetch was attempted but returned no usable feature (e.g. 404)
const featureCache = new Map<string, Feature | null>()

export function getCachedFeature(code: string): Feature | null | undefined {
  return featureCache.get(code)
}

export function setCachedFeature(code: string, feature: Feature | null): void {
  featureCache.set(code, feature)
}

export function hasCachedEntry(code: string): boolean {
  return featureCache.has(code)
}
