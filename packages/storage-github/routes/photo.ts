import { NextResponse } from 'next/server'

// TODO: Phase 1 — implement GitHub Contents API photo upload
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: 'GitHub storage not yet implemented' }, { status: 501 })
}
