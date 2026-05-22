import fs from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { travelerProfile } from '@beenthere/ui/data/demoProfile'

function profilePath(): string {
  return path.join(process.cwd(), 'dev-data', 'profile.json')
}

async function ensureDevDataDir(): Promise<void> {
  await fs.mkdir(path.join(process.cwd(), 'dev-data'), { recursive: true })
}

export async function GET(): Promise<NextResponse> {
  try {
    await ensureDevDataDir()
    const filePath = profilePath()
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      return NextResponse.json(JSON.parse(raw))
    } catch {
      // Seed from demo profile on first load
      await fs.writeFile(filePath, JSON.stringify(travelerProfile, null, 2), 'utf-8')
      return NextResponse.json(travelerProfile)
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await ensureDevDataDir()
    const profile = await request.json()
    await fs.writeFile(profilePath(), JSON.stringify(profile, null, 2), 'utf-8')
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
