import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// ONE-TIME migration route — delete this file after running!
export async function POST(request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data } = await supabase.from('store').select('data').eq('id', 1).single();
  const db = data.data;
  let migrated = 0;

  for (const u of db.users || []) {
    if (u.password && !u.passwordHash) {
      u.passwordHash = await bcrypt.hash(u.password, 10);
      delete u.password;
      migrated++;
    }
  }

  await supabase.from('store').upsert({ id: 1, data: db, updated: new Date().toISOString() });
  return Response.json({ migrated });
}
