import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const runtime = 'nodejs'

export async function GET() {
  const file = await readFile(join(process.cwd(), 'data', 'geo', 'countries-10m.json'), 'utf8')
  return new Response(file, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
