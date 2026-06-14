'use client';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import { fd, deadlineStatus, timeLeft } from '@/lib/utils';
import { StatusBadge } from '@/components/UI/Badge';

export default function DashboardPage() {
  const { db, user, t, lang } = useApp();
  if (!db || !user) return null;

  const tasks = db.tasks || [];
  const clients = db.clients || [];
  const employees = (db.users || []).filter(u => u.active !== false);
  const wh = db.wh || [];

  const myTasks = user.role === 'specialist'
    ? tasks.filter(tk => tk.assignees?.includes(user.id) || tk.responsible === user.id)
    : tasks;

  const total = myTasks.length;
  const inProgress = myTasks.filter(tk => tk.status === 'in_progress').length;
  const completed = myTasks.filter(tk => tk.status === 'completed').length;
  const lowStock = wh.filter(i => i.qty !== undefined && i.minQty !== undefined && i.qty <= i.minQty).length;

  const recent = [...myTasks].sort((a, b) => new Date(b.updated || b.created) - new Date(a.updated || a.created)).slice(0, 8);

  const warnings = myTasks.filter(tk => {
    if (!tk.deadline) return false;
    if (['completed','stopped'].includes(tk.status)) return false;
    return deadlineStatus(tk.deadline) !== 'ok';
  });

  const statusCounts = {};
  myTasks.forEach(tk => { statusCounts[tk.status] = (statusCounts[tk.status] || 0) + 1; });
  const statuses = ['pending','in_progress','paused','completed','stopped','pending_approval'];

  const STAT_CARDS = [
    { key: 'total_tasks', val: total, cls: 'teal', icon: '📋' },
    { key: 'in_progress_tasks', val: inProgress, cls: 'blue', icon: '⚙️' },
    { key: 'completed_tasks', val: completed, cls: 'purple', icon: '✅' },
    ...(user.role !== 'specialist' ? [
      { key: 'clients_count', val: clients.length, cls: 'yellow', icon: '👥' },
      { key: 'employees_count', val: employees.length, cls: 'blue', icon: '👤' },
      { key: 'low_stock', val: lowStock, cls: 'red', icon: '⚠️' },
    ] : []),
  ];

  return (
    <AppShell>
      <div className="ph">
        <div>
          <div className="pt">{t('dashboard')}</div>
          <div className="ps">{t('welcome_msg')}, {user.firstName || user.name}</div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="card" style={{ marginBottom:18, borderColor:'rgba(255,64,96,.3)' }}>
          <div className="ch"><div className="ct" style={{ color:'var(--danger)' }}>{t('deadline_warning_title')}</div></div>
          {warnings.map(tk => {
            const ds = deadlineStatus(tk.deadline);
            return (
              <div key={tk.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderTop:'1px solid var(--border)', fontSize:13 }}>
                <span>{tk.title}</span>
                <span style={{ color: ds === 'overdue' ? 'var(--danger)' : 'var(--warning)', fontWeight:700 }}>
                  {ds === 'overdue' ? t('overdue') : t('deadline_warning')} ({timeLeft(tk.deadline, lang)})
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="sgrid">
        {STAT_CARDS.map(c => (
          <div key={c.key} className={`scard ${c.cls}`}>
            <div className="si">{c.icon}</div>
            <div className="sv">{c.val}</div>
            <div className="sl">{t(c.key)}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, flexWrap:'wrap' }}>
        <div className="card">
          <div className="ch"><div className="ct">{t('recent_tasks')}</div></div>
          {recent.length === 0 ? (
            <div className="empty"><div className="eico">📋</div>{t('no_tasks')}</div>
          ) : recent.map(tk => (
            <div key={tk.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderTop:'1px solid var(--border)', fontSize:13 }}>
              <span style={{ color:'var(--text)' }}>{tk.title}</span>
              <StatusBadge status={tk.status} />
            </div>
          ))}
        </div>

        <div className="card">
          <div className="ch"><div className="ct">{t('status_dist')}</div></div>
          {statuses.filter(s => statusCounts[s]).map(s => {
            const pct = total ? Math.round((statusCounts[s] || 0) / total * 100) : 0;
            const colors = { pending:'#5A7080', in_progress:'var(--accent)', paused:'var(--warning)', completed:'var(--accent2)', stopped:'var(--danger)', pending_approval:'var(--purple)' };
            return (
              <div key={s} className="bar-row">
                <div className="bar-label">
                  <span className={`badge b-${s}`}>{t(`st_${s}`)}</span>
                  <span>{statusCounts[s] || 0}</span>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill" style={{ width:`${pct}%`, background: colors[s] }} />
                </div>
              </div>
            );
          })}
          {total === 0 && <div className="empty" style={{ padding:20 }}>{t('no_tasks')}</div>}
        </div>
      </div>
    </AppShell>
  );
}
