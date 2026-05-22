import fs from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

function photoPath(key: string): string {
  return path.join(process.cwd(), 'dev-data', 'photos', key)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  try {
    const { key } = await params
    const buffer = await fs.readFile(photoPath(key))
    // Infer content type from file header bytes
    const mimeType = detectMimeType(buffer)
    return new NextResponse(buffer, {
      headers: { 'Content-Type': mimeType, 'Cache-Control': 'public, max-age=3600' },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  try {
    const { key } = await params
    await fs.unlink(photoPath(key))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

function detectMimeType(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png'
  if (buf[0] === 0x47 && buf[1] === 0x49) return 'image/gif'
  if (buf[0] === 0x52 && buf[1] === 0x49) return 'image/webp'
  return 'application/octet-stream'
}
