import { NextResponse } from 'next/server';
import { verifyCredentials, createSessionCookie, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request): Promise<NextResponse> {
  const { email, password } = await request.json();

  if (!email || !password || !(await verifyCredentials(email, password))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await createSessionCookie();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
