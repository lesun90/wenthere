import { NextResponse } from 'next/server'
import { publicPhotoCacheHeaders } from '@beenthere/storage-cloud/server'
import { cloudUnavailable } from '../../../cloud-unavailable'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const unavailable = cloudUnavailable()
  if (unavailable) return unavailable

  return NextResponse.json(
    { error: 'Public photo proxy is not implemented yet.' },
    { status: 501, headers: publicPhotoCacheHeaders({ visible: false }) },
  )
}
