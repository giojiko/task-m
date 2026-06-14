import { supabase } from '@/lib/supabase';
import { initDB } from '@/lib/utils';

export async function GET() {
  const { data, error } = await supabase
    .from('store')
    .select('data')
    .eq('id', 1)
    .single();

  if (error || !data?.data) {
    const fresh = initDB();
    await supabase.from('store').upsert({ id: 1, data: fresh });
    return Response.json(fresh);
  }

  return Response.json(data.data);
}

export async function POST(request) {
  const body = await request.json();
  const { error } = await supabase
    .from('store')
    .upsert({ id: 1, data: body, updated: new Date().toISOString() });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
