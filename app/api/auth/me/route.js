import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return Response.json({ user: null });

  const payload = await verifySessionToken(token);
  if (!payload) return Response.json({ user: null });

  const { data } = await supabase.from('store').select('data').eq('id', 1).single();
  const db = data?.data;
  const user = (db?.users || []).find(u => u.id === payload.uid && u.active !== false);
  if (!user) return Response.json({ user: null });

  const { password: _p, passwordHash: _ph, ...safeUser } = user;
  return Response.json({ user: safeUser });
}
