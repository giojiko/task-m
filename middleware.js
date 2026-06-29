import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];
const PUBLIC_PREFIXES = ['/p/', '/offline']; // public passport pages (QR scan / code entry) + PWA offline fallback
const PUBLIC_API = [
  '/api/auth/login', '/api/auth/logout',
  '/api/passports/verify', '/api/passports/scan', '/api/passports/ai', '/api/passports/file',
];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) ||
    PUBLIC_API.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Deadline cron has its own CRON_SECRET auth
  if (pathname === '/api/email/deadline') return NextResponse.next();

  const sessionCookie = request.cookies.get('spro_session');

  if (!sessionCookie && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!sessionCookie && !pathname.startsWith('/api/') && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)).*)',
  ],
};
