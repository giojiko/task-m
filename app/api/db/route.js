import { supabase } from '@/lib/supabase';
import { initDB } from '@/lib/utils';
import { sendWelcomeEmail } from '@/lib/email';
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
    const { db: fresh, tempPassword, adminUser } = await initDB();
    await supabase.from('store').upsert({ id: 1, data: fresh });
    try {
      await sendWelcomeEmail(adminUser, tempPassword);
    } catch (e) {
      console.error('initial admin welcome email failed', e);
    }
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

  // Read current state once for both conflict detection and passwordHash guard
  const { data: prevRow } = await supabase.from('store').select('data, updated').eq('id', 1).single();

  // Conflict detection
  if (_expectedUpdated && prevRow?.updated && _expectedUpdated !== prevRow.updated) {
    return Response.json({
      error: 'CONFLICT',
      message: 'მონაცემები შეიცვალა სხვის მიერ — გვერდი განაახლეთ',
    }, { status: 409 });
  }

  // Defensive: never allow passwordHash to disappear from an active user
  const prevUsers = prevRow?.data?.users || [];
  for (const newUser of dbBody.users || []) {
    if (newUser.active === false) continue;
    const prev = prevUsers.find(u => u.id === newUser.id);
    if (prev?.passwordHash && !newUser.passwordHash) {
      return Response.json({
        error: 'INVALID_UPDATE',
        message: `მომხმარებელი ${newUser.email || newUser.id} კარგავს passwordHash-ს`,
      }, { status: 400 });
    }
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('store')
    .upsert({ id: 1, data: dbBody, updated: now });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, updated: now });
}
