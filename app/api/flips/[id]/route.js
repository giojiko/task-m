import { getSessionUser } from '@/lib/auth-guard';
import { requireFlipsAccess, auditLog } from '@/lib/flips/access';
import { supabase } from '@/lib/supabase';

const notFound = () => Response.json({ error: 'Not Found' }, { status: 404 });

export async function GET(_, { params }) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session);
  if (!level) return notFound();

  const { data, error } = await supabase
    .from('flips').select('*').eq('id', params.id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return notFound();
  return Response.json(data);
}

export async function PATCH(req, { params }) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session, 'edit');
  if (!level) return notFound();

  const body = await req.json();

  // optimistic version check
  const { data: cur } = await supabase
    .from('flips').select('version,sale_price').eq('id', params.id).maybeSingle();
  if (!cur) return notFound();
  if (body._expectedVersion !== undefined && Number(body._expectedVersion) !== cur.version) {
    return Response.json({ error: 'Conflict' }, { status: 409 });
  }

  const oldSalePrice = cur.sale_price;
  const update = sanitizePatch(body);
  update.version = cur.version + 1;

  const { data, error } = await supabase
    .from('flips').update(update).eq('id', params.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // audit: sale price change
  if (update.sale_price !== undefined && Number(update.sale_price) !== Number(oldSalePrice)) {
    await auditLog(session.uid, 'sale_price_changed', params.id, {
      from: oldSalePrice,
      to: update.sale_price,
    });
  }

  return Response.json(data);
}

export async function DELETE(_, { params }) {
  const session = await getSessionUser();
  const level = await requireFlipsAccess(session, 'edit');
  if (!level) return notFound();

  const { error } = await supabase.from('flips').delete().eq('id', params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await auditLog(session.uid, 'flip_deleted', params.id);
  return new Response(null, { status: 204 });
}

function sanitizePatch(b) {
  const allowed = ['title','address','district','sqm','buy_price','buy_date','buy_extra',
    'status','ready_date','ask_price','sale_price','sale_date','broker_mode','broker_pct',
    'broker_amt','other_sale_cost','tax_pct','notes','investor_deal_id','scenario_id'];
  const out = {};
  for (const k of allowed) {
    if (b[k] === undefined) continue;
    if (['sqm','buy_price','buy_extra','ask_price','sale_price','broker_pct','broker_amt','other_sale_cost','tax_pct'].includes(k)) {
      out[k] = Number(b[k]) || 0;
    } else if (['buy_date','ready_date','sale_date'].includes(k)) {
      out[k] = b[k] || null;
    } else if (k === 'status') {
      out[k] = ['bought','reno','ready','sold'].includes(b[k]) ? b[k] : undefined;
    } else if (k === 'broker_mode') {
      out[k] = b[k] === 'amt' ? 'amt' : 'pct';
    } else if (k === 'tax_pct') {
      out[k] = [0,5,15,20].includes(Number(b[k])) ? Number(b[k]) : 20;
    } else {
      out[k] = String(b[k] ?? '');
    }
  }
  return out;
}
