import fs from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

function photosDir(): string {
  return path.join(process.cwd(), 'dev-data', 'photos')
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await fs.mkdir(photosDir(), { recursive: true })
    const formData = await request.formData()
    const key = formData.get('key')
    const file = formData.get('file')
    if (typeof key !== 'string' || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing key or file' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(path.join(photosDir(), key), buffer)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
