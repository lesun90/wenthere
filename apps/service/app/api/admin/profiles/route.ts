import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@beenthere/storage-cloud/server'
import { cloudUnavailable } from '../../cloud-unavailable'
import { verifyAdminRequest } from '../auth'

export const runtime = 'nodejs'

interface PhotoSummaryRow {
  id: string
  status: string
  byte_size: number
  deleted_at: string | null
}

interface ProfileRow {
  id: string
  owner_id: string
  slug: string
  display_name: string
  public_visible: boolean
  suspended_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  photos?: PhotoSummaryRow[]
}

function pageSizeFrom(value: string | null): number {
  const parsed = Number(value ?? 20)
  if (!Number.isFinite(parsed)) return 20
  return Math.min(50, Math.max(1, Math.floor(parsed)))
}

function statusOf(profile: ProfileRow): 'deleted' | 'suspended' | 'public' | 'hidden' {
  if (profile.deleted_at) return 'deleted'
  if (profile.suspended_at) return 'suspended'
  return profile.public_visible ? 'public' : 'hidden'
}

function profilePayload(profile: ProfileRow) {
  const photos = profile.photos ?? []
  const storageBytes = photos.reduce((total, photo) => total + (photo.byte_size ?? 0), 0)
  return {
    id: profile.id,
    ownerId: profile.owner_id,
    slug: profile.slug,
    displayName: profile.display_name,
    publicVisible: profile.public_visible,
    suspendedAt: profile.suspended_at,
    deletedAt: profile.deleted_at,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    status: statusOf(profile),
    photoCounts: {
      total: photos.length,
      active: photos.filter(photo => photo.status === 'active' && !photo.deleted_at).length,
      uploading: photos.filter(photo => photo.status === 'uploading').length,
      failed: photos.filter(photo => photo.status === 'failed').length,
      deleted: photos.filter(photo => photo.status === 'deleted' || photo.deleted_at).length,
    },
    storageBytes,
    storageAlert: storageBytes >= 500 * 1024 * 1024,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const unavailable = cloudUnavailable()
  if (unavailable) return unavailable

  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
  const pageSize = pageSizeFrom(url.searchParams.get('pageSize'))
  const filter = url.searchParams.get('filter') ?? 'all'
  const search = url.searchParams.get('q')?.trim()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from('profiles')
    .select(`
      id,
      owner_id,
      slug,
      display_name,
      public_visible,
      suspended_at,
      deleted_at,
      created_at,
      updated_at,
      photos(id,status,byte_size,deleted_at)
    `, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (filter === 'public') query = query.eq('public_visible', true).is('suspended_at', null).is('deleted_at', null)
  if (filter === 'hidden') query = query.eq('public_visible', false).is('suspended_at', null).is('deleted_at', null)
  if (filter === 'suspended') query = query.not('suspended_at', 'is', null).is('deleted_at', null)
  if (filter === 'deleted') query = query.not('deleted_at', 'is', null)
  if (search) query = query.or(`slug.ilike.%${search}%,display_name.ilike.%${search}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const profiles = ((data ?? []) as ProfileRow[]).map(profilePayload)
  return NextResponse.json({
    profiles,
    page,
    pageSize,
    total: count ?? profiles.length,
    summary: {
      visible: profiles.filter(profile => profile.status === 'public').length,
      hidden: profiles.filter(profile => profile.status === 'hidden').length,
      suspended: profiles.filter(profile => profile.status === 'suspended').length,
      storageBytes: profiles.reduce((total, profile) => total + profile.storageBytes, 0),
    },
  })
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const unavailable = cloudUnavailable()
  if (unavailable) return unavailable

  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null)
  const profileId = typeof body?.profileId === 'string' ? body.profileId : ''
  if (!profileId) return NextResponse.json({ error: 'profileId is required.' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.publicVisible === 'boolean') patch.public_visible = body.publicVisible
  if (typeof body.suspended === 'boolean') patch.suspended_at = body.suspended ? new Date().toISOString() : null

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'No supported admin update supplied.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', profileId)
    .select('id, slug, display_name, public_visible, suspended_at, deleted_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
