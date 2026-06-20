import { supabase } from '@/lib/supabase';
import { initDB } from '@/lib/utils';
import { getSessionUser, unauthorized } from '@/lib/auth-guard';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const { data, error } = await supabase
    .from('store')
    .select('data, updated')
    .eq('id', 1)
    .single();

  if (error || !data?.data) {
    const fresh = await initDB();
    await supabase.from('store').upsert({ id: 1, data: fresh });
    return Response.json(fresh);
  }

  const requester = (data.data.users || []).find(u => u.id === session.uid);
  if (!requester || requester.active === false) return unauthorized();

  return Response.json({ ...data.data, _updated: data.updated });
}

export async function POST(request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const body = await request.json();
  const { _expectedUpdated, ...dbBody } = body;

  const requiredKeys = ['users', 'clients', 'tasks', 'invoices'];
  if (!requiredKeys.every(k => k in dbBody)) {
    return Response.json({ error: 'Invalid DB structure' }, { status: 400 });
  }

  // Conflict detection
  if (_expectedUpdated) {
    const { data: current } = await supabase.from('store').select('updated').eq('id', 1).single();
    if (current?.updated && _expectedUpdated !== current.updated) {
      return Response.json({
        error: 'CONFLICT',
        message: 'მონაცემები შეიცვალა სხვის მიერ — გვერდი განაახლეთ',
      }, { status: 409 });
    }
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('store')
    .upsert({ id: 1, data: dbBody, updated: now });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, updated: now });
}
