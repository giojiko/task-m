import { supabase } from '@/lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get('urlId')?.trim();
  const code = searchParams.get('code')?.toUpperCase().trim();

  if (!urlParam || !code) {
    return Response.json({ error: 'urlId და code სავალდებულოა' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('store').select('data').eq('id', 1).single();
  if (error) return Response.json({ error: 'Server error' }, { status: 500 });

  const passports = data?.data?.passports || [];
  const isUuid = UUID_RE.test(urlParam);

  // New (post-migration) passports: opaque urlId in the URL + printed code, both required.
  // Legacy passports created before urlId existed: the URL itself carried the code,
  // so urlParam IS the code here — just check the typed code matches.
  const passport = isUuid
    ? passports.find(p => p.urlId === urlParam && p.code === code && p.status === 'active')
    : passports.find(p => p.code === code && p.status === 'active');

  if (!passport) {
    return Response.json({ error: 'კოდი არასწორია ან passport-ი არ არსებობს' }, { status: 404 });
  }

  const { scans: _s, createdBy: _cb, urlId: _u, ...safe } = passport;
  return Response.json({ passport: safe });
}
