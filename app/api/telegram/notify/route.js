import { supabase }            from '@/lib/supabase';
import { getSessionUser, unauthorized } from '@/lib/auth-guard';
import {
  sendTelegramMessage,
  msgTaskAssigned,
  msgTaskStatusChanged,
} from '@/lib/telegram';

export async function POST(request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  try {
    const { taskId, event, oldStatus } = await request.json();
    // event: 'assigned' | 'status_changed'

    const { data } = await supabase.from('store').select('data').eq('id', 1).single();
    const db = data?.data;

    const task      = (db?.tasks   || []).find(t => t.id === taskId);
    const changer   = (db?.users   || []).find(u => u.id === session.uid);
    const client    = task?.client ? (db?.clients || []).find(c => c.id === task.client) : null;
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    const changerName = changer ? `${changer.firstName} ${changer.lastName}` : 'SmartPro';
    const clientName  = client?.name || null;

    // ── გაგზავნის სია: responsible + supervisor (duplicate-ების გარეშე) ──
    const recipientIds = new Set();
    if (task.responsible) recipientIds.add(task.responsible);

    // responsible-ის supervisor-ი
    const responsible = (db?.users || []).find(u => u.id === task.responsible);
    if (responsible?.supervisorId) recipientIds.add(responsible.supervisorId);

    // assignees-ების supervisor-ებიც
    for (const aId of task.assignees || []) {
      recipientIds.add(aId);
      const assignee = (db?.users || []).find(u => u.id === aId);
      if (assignee?.supervisorId) recipientIds.add(assignee.supervisorId);
    }

    // changer-ს ნუ ვაწუხებთ საკუთარ action-ზე
    recipientIds.delete(session.uid);

    // შეტყობინების ტექსტი
    let msgText;
    if (event === 'assigned') {
      msgText = msgTaskAssigned(task, changerName, clientName);
    } else if (event === 'status_changed') {
      msgText = msgTaskStatusChanged(task, changerName, oldStatus, task.status);
    } else {
      return Response.json({ error: 'Unknown event' }, { status: 400 });
    }

    // გაგზავნა — პარალელურად, ერთ-ერთის fail-ი სხვებს არ ბლოკავს
    const sends = [];
    for (const uid of recipientIds) {
      const user = (db?.users || []).find(u => u.id === uid);
      if (user?.telegramChatId) {
        sends.push(sendTelegramMessage(user.telegramChatId, msgText));
      }
    }
    await Promise.allSettled(sends);

    return Response.json({ ok: true, sent: sends.length });
  } catch (e) {
    console.error('Telegram notify error:', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
