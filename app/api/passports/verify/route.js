import { supabase } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const urlId = searchParams.get('urlId')?.trim();
  const code = searchParams.get('code')?.toUpperCase().trim();

  if (!urlId || !code) {
    return Response.json({ error: 'urlId და code სავალდებულოა' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('store').select('data').eq('id', 1).single();
  if (error) return Response.json({ error: 'Server error' }, { status: 500 });

  const passport = (data?.data?.passports || []).find(p =>
    p.urlId === urlId &&
    p.code === code &&
    p.status === 'active'
  );

  if (!passport) {
    return Response.json({ error: 'კოდი არასწორია ან passport-ი არ არსებობს' }, { status: 404 });
  }

  const { scans: _s, createdBy: _cb, urlId: _u, ...safe } = passport;
  return Response.json({ passport: safe });
}
