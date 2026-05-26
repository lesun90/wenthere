import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@beenthere/storage-cloud/server'

export interface VerifiedAdmin {
  userId: string
  token: string
}

export type AdminAuthResult =
  | { ok: true; admin: VerifiedAdmin }
  | { ok: false; response: NextResponse }

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export async function verifyAdminRequest(request: NextRequest): Promise<AdminAuthResult> {
  const token = bearerToken(request)
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Missing Supabase access token.' }, { status: 401 }),
    }
  }

  const supabase = createSupabaseAdminClient()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  const userId = userData.user?.id

  if (userError || !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid Supabase access token.' }, { status: 401 }),
    }
  }

  const { data: adminRow, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id, role')
    .eq('user_id', userId)
    .maybeSingle()

  if (adminError) {
    return {
      ok: false,
      response: NextResponse.json({ error: adminError.message }, { status: 500 }),
    }
  }

  if (!adminRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Admin role required.' }, { status: 403 }),
    }
  }

  return { ok: true, admin: { userId, token } }
}
