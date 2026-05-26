import { NextResponse } from 'next/server'
import { cloudUnavailable } from '../cloud-unavailable'

export const runtime = 'nodejs'

export async function PATCH(): Promise<NextResponse> {
  const unavailable = cloudUnavailable()
  if (unavailable) return unavailable

  return NextResponse.json({ error: 'Presentation updates are not implemented yet.' }, { status: 501 })
}
