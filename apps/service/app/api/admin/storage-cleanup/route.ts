import { DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { createR2Client, createSupabaseAdminClient, getCloudEnvironment } from '@beenthere/storage-cloud/server'
import { cloudUnavailable } from '../../cloud-unavailable'
import { verifyAdminRequest } from '../auth'

export const runtime = 'nodejs'

interface CleanupPhotoRow {
  id: string
  profile_id: string
  original_r2_key: string | null
  display_r2_key: string | null
  thumb_r2_key: string | null
  status: string
  deleted_at: string | null
  byte_size: number
}

function keysFor(row: CleanupPhotoRow): string[] {
  return [row.original_r2_key, row.display_r2_key, row.thumb_r2_key].filter((key): key is string => Boolean(key))
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unavailable = cloudUnavailable()
  if (unavailable) return unavailable

  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const dryRun = body?.dryRun !== false
  const limit = Math.min(100, Math.max(1, Number(body?.limit ?? 25) || 25))

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('photos')
    .select('id,profile_id,original_r2_key,display_r2_key,thumb_r2_key,status,deleted_at,byte_size')
    .or('status.in.(failed,deleted),deleted_at.not.is.null')
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const candidates = (data ?? []) as CleanupPhotoRow[]
  const objectKeys = candidates.flatMap(keysFor)

  if (!dryRun && objectKeys.length > 0) {
    const env = getCloudEnvironment()
    const r2 = createR2Client(env)
    await r2.send(new DeleteObjectsCommand({
      Bucket: env.r2Bucket,
      Delete: {
        Objects: objectKeys.map(Key => ({ Key })),
        Quiet: true,
      },
    }))
  }

  return NextResponse.json({
    dryRun,
    candidatePhotoCount: candidates.length,
    candidateObjectCount: objectKeys.length,
    candidateBytes: candidates.reduce((total, row) => total + (row.byte_size ?? 0), 0),
    deletedObjectCount: dryRun ? 0 : objectKeys.length,
    photos: candidates.map(row => ({
      id: row.id,
      profileId: row.profile_id,
      status: row.status,
      deletedAt: row.deleted_at,
      objectCount: keysFor(row).length,
      byteSize: row.byte_size,
    })),
  })
}
