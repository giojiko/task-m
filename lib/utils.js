export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function fd(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fdt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ka-GE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

export function initDB() {
  return {
    users: [{
      id: 'u1', name: 'Giorgi Jikia', firstName: 'Giorgi', lastName: 'Jikia',
      email: 'admin@smartpro.ge', password: 'admin123', role: 'super_admin',
      position: 'Director', phone: '', personalId: '', birthDate: '',
      active: true, mustSetup: false, created: new Date().toISOString()
    }],
    clients: [],
    tasks: [],
    wh: [],
    whlogs: [],
    tasklogs: [],
    photos: {},
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
