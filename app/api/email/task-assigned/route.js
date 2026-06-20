import { sendTaskAssignedEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';
import { getSessionUser, unauthorized } from '@/lib/auth-guard';

export async function POST(req) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  try {
    const { taskId, responsibleId } = await req.json();
    const { data } = await supabase.from('store').select('data').eq('id', 1).single();
    const db = data?.data;
    const task = (db?.tasks || []).find(t => t.id === taskId);
    const responsible = (db?.users || []).find(u => u.id === responsibleId);
    const client = task?.client ? (db?.clients || []).find(c => c.id === task.client) : null;

    if (!task || !responsible?.email) return Response.json({ error: 'Not found' }, { status: 404 });

    await sendTaskAssignedEmail(task, responsible, client);
    return Response.json({ ok: true });
  } catch (e) {
    console.error('task-assigned email error', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
