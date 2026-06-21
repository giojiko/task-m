import { SignJWT, jwtVerify } from 'jose';

if (!process.env.SESSION_SECRET) {
  throw new Error(
    'SESSION_SECRET environment variable არ არის დაყენებული. ' +
    'Vercel Dashboard → Settings → Environment Variables → დაამატე SESSION_SECRET ' +
    '(Production environment-ზეც!) და redeploy გააკეთე.'
  );
}

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);
const COOKIE_NAME = 'spro_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSessionToken(userId, role) {
  return await new SignJWT({ uid: userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = MAX_AGE;
