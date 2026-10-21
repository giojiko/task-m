import { getSessionUser } from '@/lib/auth-guard';
import { requireFlipsAccess } from '@/lib/flips/access';
import { supabase } from '@/lib/supabase';

const notFound = () => Response.json({ error: 'Not Found' }, { status: 404 });

export async function GET() {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session);
  if (!level) return notFound();

  const { data, error } = await supabase
    .from('investor_deals').select('*').order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session, 'edit');
  if (!level) return notFound();

  const b = await req.json();
  const { data, error } = await supabase
    .from('investor_deals')
    .insert({
      investor_name: String(b.investor_name ?? ''),
      amount: Number(b.amount) || 0,
      term_months: Number(b.term_months) || 12,
      payout_mode: ['fixed','share','hybrid','manual','service'].includes(b.payout_mode)
        ? b.payout_mode : 'hybrid',
      payout_amount: Number(b.payout_amount) || 0,
      payout_frequency_months: Number(b.payout_frequency_months) || 2,
      start_date: b.start_date || new Date().toISOString().slice(0,10),
      notes: String(b.notes ?? ''),
      created_by: String(session.uid),
    })
    .select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
