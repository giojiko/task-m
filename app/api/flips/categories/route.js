import { getSessionUser } from '@/lib/auth-guard';
import { requireFlipsAccess, isFlipsOwner } from '@/lib/flips/access';
import { supabase } from '@/lib/supabase';

const notFound = () => Response.json({ error: 'Not Found' }, { status: 404 });

export async function GET() {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session);
  if (!level) return notFound();

  const { data, error } = await supabase
    .from('flip_categories').select('*').order('sort_order');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req) {
  const session = await getSessionUser();
  if (!isFlipsOwner(session)) return notFound();

  const { name } = await req.json();
  const { data: last } = await supabase
    .from('flip_categories').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const sort_order = (last?.[0]?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('flip_categories').insert({ name: String(name), sort_order }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
