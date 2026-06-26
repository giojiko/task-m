import { supabase } from '@/lib/supabase';
import { generatePassportUrlId } from '@/lib/utils';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth-guard';

// ONE-TIME migration — delete this file immediately after running once!
export async function POST(request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();
  if (session.role !== 'super_admin') return forbidden();

  const { data, error } = await supabase
    .from('store').select('data').eq('id', 1).single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const db = data.data;
  let migrated = 0;

  db.passports = (db.passports || []).map(p => {
    if (!p.urlId) {
      migrated++;
      return { ...p, urlId: generatePassportUrlId() };
    }
    return p;
  });

  await supabase.from('store')
    .upsert({ id: 1, data: db, updated: new Date().toISOString() });

  return Response.json({ migrated, total: db.passports.length });
}
