import { Resend } from 'resend';

let _resend = null;
const getResend = () => {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
};
const FROM = 'SmartPro <task@smartpro.ge>';

const LOGO = 'https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png';

const wrap = (content) => `
<div style="font-family:Inter,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#0F1117;color:#F0F4F8;border-radius:12px;overflow:hidden;border:1px solid #2A3347">
  ${content}
  <div style="padding:18px 32px;border-top:1px solid #2A3347;color:#4A5568;font-size:12px;text-align:center">
    SmartPro Georgia &bull; office.smartpro.ge
  </div>
</div>`;

export async function sendWelcomeEmail(employee, tempPassword) {
  const html = wrap(`
    <div style="background:linear-gradient(135deg,#1BEACD,#13B89E);padding:28px 32px;text-align:center">
      <img src="${LOGO}" style="height:36px;object-fit:contain" alt="SmartPro">
      <h1 style="color:#0F1117;margin:14px 0 0;font-size:20px;font-weight:900">მოგესალმებით SmartPro-ში!</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin-bottom:16px">გამარჯობა, <strong>${employee.firstName} ${employee.lastName}</strong>!</p>
      <p style="margin-bottom:16px;color:#8B9BB4">თქვენი ანგარიში შეიქმნა. შედით სისტემაში შემდეგი მონაცემებით:</p>
      <div style="background:#161B27;border:1px solid #2A3347;border-radius:8px;padding:20px;margin:20px 0">
        <div style="margin-bottom:14px">
          <div style="color:#8B9BB4;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">ელ. ფოსტა</div>
          <div style="font-weight:700;color:#1BEACD;font-size:15px">${employee.email}</div>
        </div>
        <div>
          <div style="color:#8B9BB4;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">დროებითი პაროლი</div>
          <div style="font-weight:800;font-size:22px;letter-spacing:6px;color:#E5D936">${tempPassword}</div>
        </div>
      </div>
      <p style="color:#8B9BB4;font-size:12px;margin-bottom:20px">⚠️ პირველი შესვლისას მოგეთხოვებათ პაროლის შეცვლა.</p>
      <a href="https://office.smartpro.ge" style="display:inline-block;background:linear-gradient(135deg,#1BEACD,#13B89E);color:#0F1117;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">
        სისტემაში შესვლა →
      </a>
    </div>`);

  return getResend().emails.send({ from: FROM, to: employee.email, subject: 'მოგესალმებით SmartPro-ში! 👋', html });
}

export async function sendTaskAssignedEmail(task, responsible, client) {
  const priorityColors = { high: '#EF4444', medium: '#F59E0B', low: '#22C55E' };
  const color = priorityColors[task.priority] || '#8B9BB4';

  const html = wrap(`
    <div style="background:#161B27;border-bottom:2px solid #1BEACD;padding:20px 32px;display:flex;align-items:center;gap:16px">
      <img src="${LOGO}" style="height:28px" alt="SmartPro">
      <div>
        <div style="color:#8B9BB4;font-size:11px;text-transform:uppercase;letter-spacing:.05em">ახალი დავალება</div>
      </div>
    </div>
    <div style="padding:28px 32px">
      <h2 style="color:#1BEACD;margin:0 0 20px;font-size:18px">${task.title}</h2>
      <div style="background:#161B27;border:1px solid #2A3347;border-radius:8px;padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
        <div>
          <div style="color:#8B9BB4;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">კლიენტი</div>
          <div style="font-weight:600">${client?.name || '—'}</div>
        </div>
        <div>
          <div style="color:#8B9BB4;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">პრიორიტეტი</div>
          <div style="font-weight:700;color:${color}">${task.priority?.toUpperCase() || '—'}</div>
        </div>
        ${task.deadline ? `
        <div>
          <div style="color:#8B9BB4;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Deadline</div>
          <div style="font-weight:600;color:#F59E0B">${new Date(task.deadline).toLocaleDateString('ka-GE')}</div>
        </div>` : ''}
        ${task.desc ? `
        <div style="grid-column:1/-1">
          <div style="color:#8B9BB4;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">აღწერა</div>
          <div style="color:#8B9BB4;font-size:13px;line-height:1.6">${task.desc}</div>
        </div>` : ''}
      </div>
      <a href="https://office.smartpro.ge/tasks" style="display:inline-block;background:linear-gradient(135deg,#1BEACD,#13B89E);color:#0F1117;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">
        დავალების ნახვა →
      </a>
    </div>`);

  return getResend().emails.send({ from: FROM, to: responsible.email, subject: `📋 ახალი დავალება: ${task.title}`, html });
}

export async function sendDeadlineEmail(task, user, client, responsible) {
  const now = new Date();
  const deadline = new Date(task.deadline);
  const msLeft = deadline - now;
  const isOverdue = msLeft < 0;
  const hoursLeft = Math.abs(Math.floor(msLeft / 3600000));
  const timeLabel = isOverdue ? `⏰ ${hoursLeft} საათით გადაცილებული` : `⚠️ რჩება ${hoursLeft} საათი`;
  const accentColor = isOverdue ? '#EF4444' : '#F59E0B';

  const html = wrap(`
    <div style="background:${isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'};border-bottom:2px solid ${accentColor};padding:24px 32px">
      <img src="${LOGO}" style="height:28px" alt="SmartPro">
      <div style="font-size:28px;margin:12px 0 6px">${isOverdue ? '🔴' : '⚠️'}</div>
      <h2 style="color:${accentColor};margin:0;font-size:18px">${timeLabel}</h2>
    </div>
    <div style="padding:28px 32px">
      <h3 style="margin:0 0 18px;font-size:16px">${task.title}</h3>
      <div style="background:#161B27;border:1px solid #2A3347;border-radius:8px;padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
        <div>
          <div style="color:#8B9BB4;font-size:11px;text-transform:uppercase;margin-bottom:4px">კლიენტი</div>
          <div style="font-weight:600">${client?.name || '—'}</div>
        </div>
        <div>
          <div style="color:#8B9BB4;font-size:11px;text-transform:uppercase;margin-bottom:4px">პასუხისმგებელი</div>
          <div style="font-weight:600">${responsible ? responsible.firstName + ' ' + responsible.lastName : '—'}</div>
        </div>
        <div>
          <div style="color:#8B9BB4;font-size:11px;text-transform:uppercase;margin-bottom:4px">Deadline</div>
          <div style="font-weight:700;color:${accentColor}">${deadline.toLocaleString('ka-GE')}</div>
        </div>
      </div>
      <a href="https://office.smartpro.ge/tasks" style="display:inline-block;background:${isOverdue ? '#EF4444' : 'linear-gradient(135deg,#1BEACD,#13B89E)'};color:${isOverdue ? '#fff' : '#0F1117'};font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">
        დავალების ნახვა →
      </a>
    </div>`);

  return getResend().emails.send({ from: FROM, to: user.email, subject: `${isOverdue ? '🔴 OVERDUE' : '⚠️ Deadline'}: ${task.title}`, html });
}
