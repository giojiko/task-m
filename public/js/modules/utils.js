/* ═══════════════════════════════════════════
   SmartPro — utils.js
   Helper functions used across all modules
   ═══════════════════════════════════════════ */

const uid = () => 'id_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
function now() { return new Date().toISOString(); }
function esc(x) { if(!x) return ''; return String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fd(d) { if(!d) return '—'; try{return new Date(d).toLocaleDateString('ka-GE',{day:'2-digit',month:'2-digit',year:'numeric'});}catch{return d;} }
function fdt(d) { if(!d) return '—'; try{return new Date(d).toLocaleString('ka-GE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch{return d;} }
function isOD(d,st) { return d && !['completed','stopped'].includes(st) && new Date(d)<new Date(); }
function SL(k) { return t('st_'+k) || k; }
function PL(k) { return t('pr_'+k) || k; }
function RL(r) { return t('r_'+r) || r; }

function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className = `ti ${type}`;
  el.textContent = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 280); }, 3000);
}

function om(id) { document.getElementById(id).classList.add('open'); }
function cm(id) { document.getElementById(id).classList.remove('open'); }

function f2b(file) {
  return new Promise((r,j) => {
    const rd = new FileReader();
    rd.onload = e => r(e.target.result);
    rd.onerror = j;
    rd.readAsDataURL(file);
  });
}

function clientName(cid) { const c=DB.clients.find(x=>x.id===cid); return c?esc(c.name):''; }
function userName(uid2) { const u=DB.users.find(x=>x.id===uid2); return u?esc(u.name):''; }
function canM() { return _cu && (_cu.role==='super_admin' || _cu.role==='admin'); }

function viewPhoto(src) {
  document.getElementById('pvimg').src = src;
  document.getElementById('pviewer').classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ov').forEach(o => {
    o.addEventListener('click', e => { if(e.target===o && o.id!=='mSetup') o.classList.remove('open'); });
  });
  document.addEventListener('keydown', e => {
    if(e.key==='Escape') document.querySelectorAll('.ov.open').forEach(o => { if(o.id!=='mSetup') o.classList.remove('open'); });
  });
});

/* ── Deadline helpers ─────────────────────────────────────────────────────── */

/** computeDeadline: createdAt + durationDays -> ISO string */
function computeDeadline(createdAt, durationDays) {
  if(!createdAt || !durationDays || isNaN(parseInt(durationDays,10))) return null;
  const d = new Date(createdAt);
  d.setDate(d.getDate() + parseInt(durationDays, 10));
  return d.toISOString();
}

/** internal: ms remaining until deadline. completed/stopped/pending_approval -> null */
function _deadlineMs(deadline, status) {
  if(!deadline || ['completed','stopped','pending_approval'].includes(status)) return null;
  return new Date(deadline) - new Date();
}

/** human-readable time remaining */
function formatTimeLeft(deadline, status) {
  const ms = _deadlineMs(deadline, status);
  if(ms === null) return null;
  if(ms < 0) return t('overdue');
  const totalH = Math.floor(ms / 3600000);
  const days   = Math.floor(totalH / 24);
  const hours  = totalH % 24;
  if(days > 0) return days + t('day_short') + ' ' + hours + t('hour_short');
  return hours + t('hour_short');
}

/** true = last 24 hours, active status */
function isDeadlineWarning(deadline, status) {
  const ms = _deadlineMs(deadline, status);
  return ms !== null && ms >= 0 && ms <= 86400000;
}

/** true = deadline passed */
function isDeadlineOverdue(deadline, status) {
  const ms = _deadlineMs(deadline, status);
  return ms !== null && ms < 0;
}
