import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { code, userAgent } = await request.json();
    if (!code) return Response.json({ ok: true });

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const { data, error } = await supabase
      .from('store').select('data').eq('id', 1).single();
    if (error || !data?.data) return Response.json({ ok: true });

    const db = data.data;
    const passport = (db.passports || []).find(p => p.code === code);
    if (!passport) return Response.json({ ok: true });

    const scan = {
      at: new Date().toISOString(),
      ip,
      ua: userAgent?.substring(0, 200) || '',
    };
    passport.scans = [...(passport.scans || []).slice(-99), scan];
    passport.totalScans = (passport.totalScans || 0) + 1;

    await supabase.from('store')
      .upsert({ id: 1, data: db, updated: new Date().toISOString() });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
