import { Resend } from 'resend';

let _resend = null;
const getResend = () => {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
};
const FROM = 'SmartPro <task@smartpro.ge>';

const LOGO = 'https://office.smartpro.ge/brand/logo-gold.png';

const wrap = (content) => `
<div style="font-family:'Noto Sans Georgian',-apple-system,Arial,sans-serif;max-width:560px;margin:0 auto;background:#FFFFFF;color:#071A2B;border-radius:14px;overflow:hidden;border:1px solid #E6DFD0">
  ${content}
  <div style="padding:18px 32px;border-top:1px solid #E6DFD0;color:#7A8592;font-size:12px;background:#F5F2EA;text-align:center">
    SmartPro Georgia &bull; office.smartpro.ge
  </div>
</div>`;

export async function sendWelcomeEmail(employee, tempPassword) {
  const html = wrap(`
    <div style="background:#071A2B;border-bottom:3px solid #C99A4A;padding:28px 32px;text-align:center">
      <img src="${LOGO}" style="height:36px;object-fit:contain" alt="SmartPro">
      <h1 style="color:#F5F2EA;margin:14px 0 0;font-size:20px;font-weight:900">მოგესალმებით SmartPro-ში!</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin-bottom:16px">გამარჯობა, <strong>${employee.firstName} ${employee.lastName}</strong>!</p>
      <p style="margin-bottom:16px;color:#5B6775">თქვენი ანგარიში შეიქმნა. შედით სისტემაში შემდეგი მონაცემებით:</p>
      <div style="background:#F5F2EA;border:1px solid #E6DFD0;border-radius:8px;padding:20px;margin:20px 0">
        <div style="margin-bottom:14px">
          <div style="color:#5B6775;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">ელ. ფოსტა</div>
          <div style="font-weight:700;color:#7A561A;font-size:15px">${employee.email}</div>
        </div>
        <div>
          <div style="color:#5B6775;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">დროებითი პაროლი</div>
          <div style="font-weight:800;font-size:22px;letter-spacing:6px;color:#9A7230">${tempPassword}</div>
        </div>
      </div>
      <p style="color:#5B6775;font-size:12px;margin-bottom:20px">⚠️ პირველი შესვლისას მოგეთხოვებათ პაროლის შეცვლა.</p>
      <a href="https://office.smartpro.ge" style="display:inline-block;background:#C99A4A;color:#071A2B;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">
        სისტემაში შესვლა →
      </a>
    </div>`);

  return getResend().emails.send({ from: FROM, to: employee.email, subject: 'მოგესალმებით SmartPro-ში! 👋', html });
}

export async function sendPasswordResetEmail(employee, newPassword) {
  const html = wrap(`
    <h2 style="color:#071A2B;font-size:20px;font-weight:700;margin-bottom:4px">
      🔐 პაროლი განახლდა
    </h2>
    <p style="color:#5B6775;font-size:14px;margin-bottom:24px">
      ${employee.firstName} ${employee.lastName}, თქვენი SmartPro-ს ანგარიშის პაროლი ადმინისტრატორმა განაახლა.
    </p>
    <div style="background:#F5F2EA;border-radius:10px;padding:16px 20px;margin-bottom:20px;border:1px solid #E6DFD0">
      <div style="color:#5B6775;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">
        ახალი პაროლი
      </div>
      <div style="color:#7A561A;font-size:22px;font-weight:800;font-family:monospace;letter-spacing:.08em">
        ${newPassword}
      </div>
    </div>
    <p style="color:#5B6775;font-size:12px;margin-bottom:20px">
      ⚠️ გთხოვთ პირველივე შესვლისას შეიცვალოთ პაროლი.
    </p>
    <a href="https://office.smartpro.ge/login"
      style="display:inline-block;background:#C99A4A;
      color:#F5F2EA;padding:12px 28px;border-radius:8px;font-weight:700;
      text-decoration:none;font-size:14px">
      შესვლა →
    </a>
  `);
  return getResend().emails.send({
    from: FROM,
    to: employee.email,
    subject: '🔐 თქვენი SmartPro პაროლი განახლდა',
    html,
  });
}

export async function sendTaskAssignedEmail(task, responsible, client) {
  const priorityColors = { high: '#C0392B', medium: '#B26B00', low: '#2E7D4F' };
  const color = priorityColors[task.priority] || '#5B6775';

  const html = wrap(`
    <div style="background:#071A2B;border-bottom:3px solid #C99A4A;padding:20px 32px;display:flex;align-items:center;gap:16px">
      <img src="${LOGO}" style="height:28px" alt="SmartPro">
      <div>
        <div style="color:#E6C07E;font-size:11px;text-transform:uppercase;letter-spacing:.05em">ახალი დავალება</div>
      </div>
    </div>
    <div style="padding:28px 32px">
      <h2 style="color:#7A561A;margin:0 0 20px;font-size:18px">${task.title}</h2>
      <div style="background:#F5F2EA;border:1px solid #E6DFD0;border-radius:8px;padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
        <div>
          <div style="color:#5B6775;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">კლიენტი</div>
          <div style="font-weight:600">${client?.name || '—'}</div>
        </div>
        <div>
          <div style="color:#5B6775;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">პრიორიტეტი</div>
          <div style="font-weight:700;color:${color}">${task.priority?.toUpperCase() || '—'}</div>
        </div>
        ${task.deadline ? `
        <div>
          <div style="color:#5B6775;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Deadline</div>
          <div style="font-weight:600;color:#B26B00">${new Date(task.deadline).toLocaleDateString('ka-GE')}</div>
        </div>` : ''}
        ${task.desc ? `
        <div style="grid-column:1/-1">
          <div style="color:#5B6775;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">აღწერა</div>
          <div style="color:#5B6775;font-size:13px;line-height:1.6">${task.desc}</div>
        </div>` : ''}
      </div>
      <a href="https://office.smartpro.ge/tasks" style="display:inline-block;background:#C99A4A;color:#071A2B;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">
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
  const accentColor = isOverdue ? '#C0392B' : '#B26B00';

  const html = wrap(`
    <div style="background:${isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'};border-bottom:2px solid ${accentColor};padding:24px 32px">
      <img src="${LOGO}" style="height:28px" alt="SmartPro">
      <div style="font-size:28px;margin:12px 0 6px">${isOverdue ? '🔴' : '⚠️'}</div>
      <h2 style="color:${accentColor};margin:0;font-size:18px">${timeLabel}</h2>
    </div>
    <div style="padding:28px 32px">
      <h3 style="margin:0 0 18px;font-size:16px">${task.title}</h3>
      <div style="background:#F5F2EA;border:1px solid #E6DFD0;border-radius:8px;padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
        <div>
          <div style="color:#5B6775;font-size:11px;text-transform:uppercase;margin-bottom:4px">კლიენტი</div>
          <div style="font-weight:600">${client?.name || '—'}</div>
        </div>
        <div>
          <div style="color:#5B6775;font-size:11px;text-transform:uppercase;margin-bottom:4px">პასუხისმგებელი</div>
          <div style="font-weight:600">${responsible ? responsible.firstName + ' ' + responsible.lastName : '—'}</div>
        </div>
        <div>
          <div style="color:#5B6775;font-size:11px;text-transform:uppercase;margin-bottom:4px">Deadline</div>
          <div style="font-weight:700;color:${accentColor}">${deadline.toLocaleString('ka-GE')}</div>
        </div>
      </div>
      <a href="https://office.smartpro.ge/tasks" style="display:inline-block;background:${isOverdue ? '#C0392B' : '#C99A4A'};color:${isOverdue ? '#fff' : '#071A2B'};font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">
        დავალების ნახვა →
      </a>
    </div>`);

  return getResend().emails.send({ from: FROM, to: user.email, subject: `${isOverdue ? '🔴 OVERDUE' : '⚠️ Deadline'}: ${task.title}`, html });
}
