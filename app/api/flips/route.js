import { getSessionUser } from '@/lib/auth-guard';
import { requireFlipsAccess } from '@/lib/flips/access';
import { supabase } from '@/lib/supabase';

const notFound = () => Response.json({ error: 'Not Found' }, { status: 404 });

export async function GET(req) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session);
  if (!level) return notFound();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let q = supabase.from('flips').select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session, 'edit');
  if (!level) return notFound();

  const body = await req.json();
  const { data, error } = await supabase
    .from('flips')
    .insert({ ...sanitize(body), created_by: String(session.uid), version: 1 })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

function sanitize(b) {
  return {
    title: String(b.title ?? ''),
    address: String(b.address ?? ''),
    district: String(b.district ?? ''),
    sqm: Number(b.sqm) || 0,
    buy_price: Number(b.buy_price) || 0,
    buy_date: b.buy_date || null,
    buy_extra: Number(b.buy_extra) || 0,
    status: ['bought','reno','ready','sold'].includes(b.status) ? b.status : 'bought',
    ready_date: b.ready_date || null,
    ask_price: Number(b.ask_price) || 0,
    sale_price: Number(b.sale_price) || 0,
    sale_date: b.sale_date || null,
    broker_mode: b.broker_mode === 'amt' ? 'amt' : 'pct',
    broker_pct: Number(b.broker_pct) || 2,
    broker_amt: Number(b.broker_amt) || 0,
    other_sale_cost: Number(b.other_sale_cost) || 0,
    tax_pct: [0,5,15,20].includes(Number(b.tax_pct)) ? Number(b.tax_pct) : 20,
    notes: String(b.notes ?? ''),
    investor_deal_id: b.investor_deal_id || null,
    scenario_id: b.scenario_id || null,
  };
}
