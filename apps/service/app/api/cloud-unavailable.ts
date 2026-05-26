import { NextResponse } from 'next/server'
import { missingCloudEnvironment } from '@beenthere/storage-cloud/server'

export function cloudUnavailable(): NextResponse | null {
  const missing = missingCloudEnvironment()
  if (missing.length === 0) return null

  return NextResponse.json(
    {
      error: 'Cloud backend is not configured.',
      missing,
    },
    { status: 503 },
  )
}
