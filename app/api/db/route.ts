import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function GET() {
  const { data, error } = await supabase
    .from('store').select('data').eq('id', 1).single();
  if (error) return Response.json(null);
  return Response.json(data.data);
}

export async function POST(req) {
  try {
    const body = await req.json();
    await supabase.from('store')
      .upsert({ id: 1, data: body, updated: new Date().toISOString() });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}