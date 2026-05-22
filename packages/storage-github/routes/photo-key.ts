import { NextResponse } from 'next/server'

// TODO: Phase 1 — implement GitHub Contents API photo proxy and delete
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'GitHub storage not yet implemented' }, { status: 501 })
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ error: 'GitHub storage not yet implemented' }, { status: 501 })
}
