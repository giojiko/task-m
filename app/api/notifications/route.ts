import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function GET() {
  const { data, error } = await supabase
    .from('store').select('data').eq('id', 1).single();
  if (error) return Response.json([]);
  const notifs = data?.data?.notifications || [];
  return Response.json(notifs);
}