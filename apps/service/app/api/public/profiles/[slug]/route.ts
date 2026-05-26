import { NextResponse } from 'next/server'
import { cloudUnavailable } from '../../../cloud-unavailable'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const unavailable = cloudUnavailable()
  if (unavailable) return unavailable

  return NextResponse.json({ error: 'Public profile loading is not implemented yet.' }, { status: 501 })
}
