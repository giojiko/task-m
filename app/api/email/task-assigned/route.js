import { sendTaskAssignedEmail } from '@/lib/email';

export async function POST(req) {
  try {
    const { task, responsible, client } = await req.json();
    if (!responsible?.email) return Response.json({ error: 'Missing responsible' }, { status: 400 });
    await sendTaskAssignedEmail(task, responsible, client);
    return Response.json({ ok: true });
  } catch (e) {
    console.error('task-assigned email error', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
