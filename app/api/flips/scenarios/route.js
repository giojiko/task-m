import { getSessionUser } from '@/lib/auth-guard';
import { requireFlipsAccess } from '@/lib/flips/access';
import { supabase } from '@/lib/supabase';

const notFound = () => Response.json({ error: 'Not Found' }, { status: 404 });

export async function GET() {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session);
  if (!level) return notFound();

  const { data, error } = await supabase
    .from('flip_scenarios').select('*').order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session, 'edit');
  if (!level) return notFound();

  const { name, params } = await req.json();
  const { data, error } = await supabase
    .from('flip_scenarios')
    .insert({ name: String(name), params, created_by: String(session.uid) })
    .select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

export async function DELETE(req) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session, 'edit');
  if (!level) return notFound();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('flip_scenarios').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
