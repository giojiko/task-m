import { supabase } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code')?.toUpperCase().trim();
  if (!code) return Response.json({ error: 'code საჭიროა' }, { status: 400 });

  const { data, error } = await supabase.from('store').select('data').eq('id', 1).single();
  if (error) return Response.json({ error: 'Server error' }, { status: 500 });

  const passport = (data?.data?.passports || []).find(p =>
    p.code === code && p.status === 'active'
  );

  if (!passport) return Response.json({ error: 'Not found' }, { status: 404 });

  // strip sensitive fields before sending to a public, unauthenticated client
  const { scans: _s, createdBy: _c, ...safe } = passport;
  return Response.json({ passport: safe });
}
