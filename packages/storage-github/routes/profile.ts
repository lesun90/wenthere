import { NextResponse } from 'next/server'

// TODO: Phase 1 — implement GitHub Contents API read/write for profile.json
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'GitHub storage not yet implemented' }, { status: 501 })
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json({ error: 'GitHub storage not yet implemented' }, { status: 501 })
}
