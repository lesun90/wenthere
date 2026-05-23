export function fileNameFor(code: string): string | null {
  if (!code.endsWith('.geojson')) return null
  const subdivisionCode = code.slice(0, -'.geojson'.length)
  if (!/^[^/\\]+$/.test(subdivisionCode)) return null
  return `${subdivisionCode}.geojson`
}
