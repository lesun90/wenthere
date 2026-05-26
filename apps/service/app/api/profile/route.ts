import { NextResponse } from 'next/server'
import { cloudUnavailable } from '../cloud-unavailable'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const unavailable = cloudUnavailable()
  if (unavailable) return unavailable

  return NextResponse.json({ error: 'Owner profile loading is not implemented yet.' }, { status: 501 })
}

export async function PATCH(): Promise<NextResponse> {
  const unavailable = cloudUnavailable()
  if (unavailable) return unavailable

  return NextResponse.json({ error: 'Owner profile updates are not implemented yet.' }, { status: 501 })
}
