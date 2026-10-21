import { getSessionUser } from '@/lib/auth-guard';
import { requireFlipsAccess } from '@/lib/flips/access';
import { supabase } from '@/lib/supabase';

const notFound = () => Response.json({ error: 'Not Found' }, { status: 404 });

export async function GET(_, { params }) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session);
  if (!level) return notFound();

  const { data, error } = await supabase
    .from('investor_payouts').select('*').eq('deal_id', params.id).order('date', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req, { params }) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session, 'edit');
  if (!level) return notFound();

  const b = await req.json();
  const { data, error } = await supabase
    .from('investor_payouts')
    .insert({
      deal_id: params.id,
      date: b.date || new Date().toISOString().slice(0,10),
      amount: Number(b.amount) || 0,
      type: b.type === 'principal' ? 'principal' : 'dividend',
      note: String(b.note ?? ''),
      created_by: String(session.uid),
    })
    .select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
