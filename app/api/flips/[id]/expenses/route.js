import { getSessionUser } from '@/lib/auth-guard';
import { requireFlipsAccess } from '@/lib/flips/access';
import { supabase } from '@/lib/supabase';

const notFound = () => Response.json({ error: 'Not Found' }, { status: 404 });

export async function GET(_, { params }) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session);
  if (!level) return notFound();

  const { data, error } = await supabase
    .from('flip_expenses').select('*').eq('flip_id', params.id).order('date', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req, { params }) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session, 'edit');
  if (!level) return notFound();

  const b = await req.json();
  const { data, error } = await supabase
    .from('flip_expenses')
    .insert({
      flip_id: params.id,
      category: String(b.category ?? ''),
      kind: b.kind === 'lab' ? 'lab' : 'mat',
      amount: Number(b.amount) || 0,
      note: String(b.note ?? ''),
      date: b.date || new Date().toISOString().slice(0, 10),
      created_by: String(session.uid),
    })
    .select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // auto-advance status: bought → reno when first expense added
  await supabase.from('flips')
    .update({ status: 'reno' })
    .eq('id', params.id)
    .eq('status', 'bought');

  return Response.json(data, { status: 201 });
}

export async function DELETE(req, { params }) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session, 'edit');
  if (!level) return notFound();

  const { searchParams } = new URL(req.url);
  const expId = searchParams.get('expId');
  if (!expId) return Response.json({ error: 'expId required' }, { status: 400 });

  const { error } = await supabase
    .from('flip_expenses').delete().eq('id', expId).eq('flip_id', params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
