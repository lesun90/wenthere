import { NextResponse } from 'next/server'
import { cloudUnavailable } from '../cloud-unavailable'

export const runtime = 'nodejs'

export async function POST(): Promise<NextResponse> {
  const unavailable = cloudUnavailable()
  if (unavailable) return unavailable

  return NextResponse.json({ error: 'Cloud photo uploads are not implemented yet.' }, { status: 501 })
}
