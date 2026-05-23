import fs from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

function profileIdFromRequest(request: Request): string {
  const profileId = new URL(request.url).searchParams.get('profileId') ?? ''
  return profileId.replace(/[^a-zA-Z0-9_-]+/g, '').trim()
}

function profilePath(profileId: string): string {
  const fileName = profileId ? `profile-${profileId}.json` : 'profile.json'
  return path.join(process.cwd(), 'dev-data', fileName)
}

async function ensureDevDataDir(): Promise<void> {
  await fs.mkdir(path.join(process.cwd(), 'dev-data'), { recursive: true })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await ensureDevDataDir()
    const raw = await fs.readFile(profilePath(profileIdFromRequest(request)), 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await ensureDevDataDir()
    const profile = await request.json()
    await fs.writeFile(profilePath(profileIdFromRequest(request)), JSON.stringify(profile, null, 2), 'utf-8')
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
