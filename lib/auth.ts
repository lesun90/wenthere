import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { OWNER_ID } from './types';

const COOKIE_NAME = 'wt_session';
const EXPIRY = '30d';

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function createSessionCookie(): Promise<string> {
  return new SignJWT({ userId: OWNER_ID })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, secret());
  return { userId: payload.userId as string };
}

export async function getSession(): Promise<{ userId: string } | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<boolean> {
  return (
    email === process.env.OWNER_EMAIL &&
    password === process.env.OWNER_PASSWORD
  );
}

export { COOKIE_NAME };
