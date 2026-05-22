import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const runtime = 'nodejs'

const geoDir = join(process.env.UI_DATA_DIR ?? join(process.cwd(), '../../packages/ui/data'), 'geo')

function fileNameFor(code: string): string | null {
  if (!code.endsWith('.geojson')) return null
  const subdivisionCode = code.slice(0, -'.geojson'.length)
  if (!/^[A-Za-z0-9-]+$/.test(subdivisionCode)) return null
  return `${subdivisionCode}.geojson`
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params
  const fileName = fileNameFor(code)
  if (!fileName) return new Response('Not found', { status: 404 })

  try {
    const file = await readFile(join(geoDir, 'subdivisions', fileName), 'utf8')
    return new Response(file, {
      headers: {
        'content-type': 'application/geo+json; charset=utf-8',
        'cache-control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
