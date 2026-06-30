import { supabase } from '@/lib/supabase';
import { sendDeadlineEmail } from '@/lib/email';
import { sendTelegramMessage, msgDeadlineReminder } from '@/lib/telegram';

export async function GET(req) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase.from('store').select('data').eq('id', 1).single();
    if (error || !data?.data) return Response.json({ sent: 0 });

    const db = data.data;
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 3600 * 1000);
    const activeStatuses = ['pending', 'in_progress', 'paused'];

    const warningTasks = (db.tasks || []).filter(t =>
      activeStatuses.includes(t.status) &&
      t.deadline &&
      !t.deadline_email_sent &&
      new Date(t.deadline) <= in24h
    );

    const admins = (db.users || []).filter(u => u.active && (u.role === 'super_admin' || u.role === 'admin'));
    let sent = 0;

    for (const task of warningTasks) {
      const responsible = task.responsible ? (db.users || []).find(u => u.id === task.responsible) : null;
      const client = (db.clients || []).find(c => c.id === task.client);
      const recipients = [...admins];
      if (responsible && !recipients.find(u => u.id === responsible.id)) recipients.push(responsible);

      for (const user of recipients) {
        try {
          await sendDeadlineEmail(task, user, client, responsible);
          sent++;
        } catch (e) {
          console.error('deadline email error', e);
        }
      }

      // ── Telegram ──
      const telegramRecipients = new Set();
      if (responsible?.telegramChatId) telegramRecipients.add(responsible.telegramChatId);
      if (responsible?.supervisorId) {
        const sup = (db.users || []).find(u => u.id === responsible.supervisorId);
        if (sup?.telegramChatId) telegramRecipients.add(sup.telegramChatId);
      }
      for (const chatId of telegramRecipients) {
        await sendTelegramMessage(chatId, msgDeadlineReminder(task, client?.name));
      }

      task.deadline_email_sent = true;
    }

    if (warningTasks.length > 0) {
      await supabase.from('store').upsert({ id: 1, data: db, updated: new Date().toISOString() });
    }

    return Response.json({ sent });
  } catch (e) {
    console.error('deadline cron error', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
