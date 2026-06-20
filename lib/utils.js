export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export async function hashPassword(plain) {
  const bcrypt = (await import('bcryptjs')).default;
  return await bcrypt.hash(plain, 10);
}

export function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function fd(d) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch { return d; }
}

export function fdt(d) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();
    const hour  = String(date.getHours()).padStart(2, '0');
    const min   = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${min}`;
  } catch { return d; }
}

export function calcDeadline(createdAt, durationDays) {
  if (!createdAt || !durationDays) return null;
  const d = new Date(createdAt);
  d.setDate(d.getDate() + Number(durationDays));
  return d.toISOString();
}

export function deadlineStatus(deadline) {
  if (!deadline) return null;
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  const diff = dl - now;
  if (diff < 0) return 'overdue';
  if (diff < 24 * 3600 * 1000) return 'warning';
  return 'ok';
}

export function timeLeft(deadline, lang = 'ka') {
  if (!deadline) return '';
  const diff = new Date(deadline).getTime() - Date.now();
  const dayShort = lang === 'en' ? 'd' : lang === 'ru' ? 'д' : 'დ';
  const hourShort = lang === 'en' ? 'h' : lang === 'ru' ? 'ч' : 'სთ';
  if (diff < 0) {
    const h = Math.abs(Math.ceil(diff / 3600000));
    return h > 48 ? `-${Math.ceil(h / 24)}${dayShort}` : `-${h}${hourShort}`;
  }
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}${hourShort}`;
  return `${Math.floor(h / 24)}${dayShort}`;
}

export function getNextInvoiceNumber(db) {
  const year = new Date().getFullYear();
  const yearInvoices = (db?.invoices || []).filter(inv => inv.number?.includes(`-${year}-`));
  const maxNum = yearInvoices.reduce((max, inv) => {
    const match = inv.number?.match(/-(\d+)$/);
    const n = match ? parseInt(match[1], 10) : 0;
    return Math.max(max, n);
  }, 0);
  return `SP-${year}-${String(maxNum + 1).padStart(3, '0')}`;
}

export function calcInvoiceTotals(items, discount = 0) {
  const subtotal = items.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);
  const vatAmount = items.reduce((s, i) => {
    if (!i.vatEnabled) return s;
    const lineTotal = Number(i.qty) * Number(i.price);
    return s + lineTotal * (Number(i.vatRate ?? 18) / 100);
  }, 0);
  const total = Math.max(0, subtotal + vatAmount - Number(discount));
  return { subtotal, vatAmount, total };
}

export async function initDB() {
  return {
    users: [{
      id: 'u1', name: 'Giorgi Jikia', firstName: 'Giorgi', lastName: 'Jikia',
      email: 'admin@smartpro.ge',
      passwordHash: await hashPassword(crypto.randomUUID()),
      mustSetup: true,
      role: 'super_admin',
      position: 'Director', phone: '', personalId: '', birthDate: '',
      active: true, created: new Date().toISOString()
    }],
    clients: [],
    tasks: [],
    wh: [],
    whlogs: [],
    tasklogs: [],
    photos: {},
    invoices: [],
    directions: [
      { id: 'd1', name: 'ელექტროობა', nameEn: 'Electricity', nameRu: 'Электричество', desc: 'ენერგოეფექტური ელექტრო სისტემები', color: '#E5D936', icon: '⚡' },
      { id: 'd2', name: 'სუსტი დენები', nameEn: 'Low Voltage', nameRu: 'Слаботочные системы', desc: 'CCTV, განგაში, წვდომის კონტროლი', color: '#1BEACD', icon: '📡' },
      { id: 'd3', name: 'უსაფრთხოების კამერები', nameEn: 'Security Cameras', nameRu: 'Камеры безопасности', desc: 'CCTV სისტემების მონტაჟი', color: '#7B5FD4', icon: '📷' },
      { id: 'd4', name: 'სახანძრო სიგნალიზაცია', nameEn: 'Fire Alarm', nameRu: 'Пожарная сигнализация', desc: 'სახანძრო გამაფრთხილებელი სისტემები', color: '#FF4060', icon: '🔥' },
      { id: 'd5', name: 'ინტერნეტ ქსელი', nameEn: 'Internet Network', nameRu: 'Интернет-сеть', desc: 'ქსელური ინფრასტრუქტურა', color: '#004584', icon: '🌐' },
      { id: 'd6', name: 'ჭკვიანი სახლი', nameEn: 'Smart Home', nameRu: 'Умный дом', desc: 'ავტომატიზაციის სისტემები', color: '#06B59C', icon: '🏠' },
      { id: 'd7', name: 'მზის პანელები', nameEn: 'Solar Panels', nameRu: 'Солнечные панели', desc: 'მზის ენერგიის სისტემები', color: '#FFB800', icon: '☀️' },
      { id: 'd8', name: 'კომპიუტერული მომსახურება', nameEn: 'IT Service', nameRu: 'IT Обслуживание', desc: 'IT მხარდაჭერა და ოპტიმიზაცია', color: '#AAB9C8', icon: '💻' },
      { id: 'd9', name: 'ვებ დეველოპმენტი', nameEn: 'Web Development', nameRu: 'Веб-разработка', desc: 'ვებსაიტების შექმნა', color: '#9B5CFF', icon: '🖥️' },
    ],
  };
}
