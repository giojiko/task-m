const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL  = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendTelegramMessage(chatId, text) {
  if (!BOT_TOKEN || !chatId) return;
  try {
    const res = await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.warn(`Telegram send failed for ${chatId}:`, data.description);
    }
    return data;
  } catch (e) {
    console.warn('Telegram error:', e.message);
  }
}

// ── Message templates ──

export function msgTaskAssigned(task, assignerName, clientName) {
  const deadline = task.deadline
    ? `\n📅 <b>Deadline:</b> ${new Date(task.deadline).toLocaleDateString('ka-GE')}`
    : '';
  const client = clientName
    ? `\n👤 <b>კლიენტი:</b> ${clientName}`
    : '';
  const priority = {
    high:   '🔴 მაღალი',
    medium: '🟡 საშუალო',
    low:    '🟢 დაბალი',
  }[task.priority] || task.priority || '—';

  return `🆕 <b>ახალი დავალება მინიჭებული!</b>

📋 <b>${task.title}</b>${client}${deadline}
⚡ <b>პრიორიტეტი:</b> ${priority}
👤 <b>მინიჭა:</b> ${assignerName}

${task.desc ? `📝 ${task.desc.substring(0, 200)}${task.desc.length > 200 ? '...' : ''}` : ''}

🔗 office.smartpro.ge/tasks`;
}

export function msgTaskStatusChanged(task, changerName, oldStatus, newStatus) {
  const statusMap = {
    pending:     '⏳ მოლოდინში',
    in_progress: '🔧 მიმდინარე',
    completed:   '✅ დასრულებული',
    stopped:     '⛔ შეჩერებული',
  };
  return `🔄 <b>დავალების სტატუსი შეიცვალა</b>

📋 <b>${task.title}</b>
📊 ${statusMap[oldStatus] || oldStatus} → ${statusMap[newStatus] || newStatus}
👤 <b>შეცვალა:</b> ${changerName}

🔗 office.smartpro.ge/tasks`;
}

export function msgDeadlineReminder(task, clientName) {
  const deadline = new Date(task.deadline);
  const now      = new Date();
  const diffH    = Math.round((deadline - now) / 3600000);
  const client   = clientName ? `\n👤 <b>კლიენტი:</b> ${clientName}` : '';

  return `⚠️ <b>Deadline-ის გახსენება!</b>

📋 <b>${task.title}</b>${client}
📅 <b>ვადა:</b> ${deadline.toLocaleDateString('ka-GE')} ${deadline.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
⏰ <b>დარჩა:</b> ${diffH > 0 ? `${diffH} საათი` : 'ვადა გავიდა!'}

🔗 office.smartpro.ge/tasks`;
}
