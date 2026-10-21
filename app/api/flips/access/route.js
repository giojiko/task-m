import { getSessionUser } from '@/lib/auth-guard';
import { isFlipsOwner, auditLog } from '@/lib/flips/access';
import { supabase } from '@/lib/supabase';

const notFound = () => Response.json({ error: 'Not Found' }, { status: 404 });

export async function GET() {
  const session = await getSessionUser();
  if (!isFlipsOwner(session)) return notFound();

  const { data, error } = await supabase
    .from('flips_access').select('*').order('granted_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req) {
  const session = await getSessionUser();
  if (!isFlipsOwner(session)) return notFound();

  const { user_id, level } = await req.json();
  if (!user_id || !['view','edit'].includes(level)) {
    return Response.json({ error: 'user_id and level (view|edit) required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('flips_access')
    .upsert({ user_id: String(user_id), level, granted_by: String(session.uid) }, { onConflict: 'user_id' })
    .select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  await auditLog(session.uid, 'access_granted', user_id, { level });
  return Response.json(data, { status: 201 });
}

export async function DELETE(req) {
  const session = await getSessionUser();
  if (!isFlipsOwner(session)) return notFound();

  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');
  if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 });

  const { error } = await supabase.from('flips_access').delete().eq('user_id', user_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await auditLog(session.uid, 'access_revoked', user_id);
  return new Response(null, { status: 204 });
}
