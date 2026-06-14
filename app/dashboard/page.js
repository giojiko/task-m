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

  const total      = myTasks.length;
  const inProgress = myTasks.filter(tk => tk.status === 'in_progress').length;
  const completed  = myTasks.filter(tk => tk.status === 'completed').length;
  const lowStock   = wh.filter(i => i.qty !== undefined && i.minQty !== undefined && i.qty <= i.minQty).length;

  const recent = [...myTasks]
    .sort((a, b) => new Date(b.updated || b.created) - new Date(a.updated || a.created))
    .slice(0, 8);

  const warnings = myTasks.filter(tk => {
    if (!tk.deadline) return false;
    if (['completed','stopped'].includes(tk.status)) return false;
    return deadlineStatus(tk.deadline) !== 'ok';
  });

  const statusCounts = {};
  myTasks.forEach(tk => { statusCounts[tk.status] = (statusCounts[tk.status] || 0) + 1; });
  const statuses = ['pending','in_progress','paused','completed','stopped','pending_approval'];

  const STAT_CARDS = [
    { key: 'total_tasks',      val: total,            cls: 'stat-blue',   icon: '☑' },
    { key: 'in_progress_tasks',val: inProgress,       cls: 'stat-teal',   icon: '⚙' },
    { key: 'completed_tasks',  val: completed,        cls: 'stat-green',  icon: '✓' },
    ...(user.role !== 'specialist' ? [
      { key: 'clients_count',   val: clients.length,   cls: 'stat-yellow', icon: '◉' },
      { key: 'employees_count', val: employees.length, cls: 'stat-purple', icon: '◎' },
      { key: 'low_stock',       val: lowStock,         cls: 'stat-red',    icon: '⚠' },
    ] : []),
  ];

  const statusColors = {
    pending: '#A1A1AA',
    in_progress: '#60A5FA',
    paused: '#FCD34D',
    completed: '#4ADE80',
    stopped: '#F87171',
    pending_approval: '#C084FC',
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">{t('dashboard')}</div>
          <div className="page-subtitle">{t('welcome_msg')}, {user.firstName || user.name}</div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(239,68,68,0.25)' }}>
          <div className="card-header" style={{ background: 'rgba(239,68,68,0.05)' }}>
            <span className="card-title" style={{ color: 'var(--danger)' }}>
              ⚠ {t('deadline_warning_title')} ({warnings.length})
            </span>
          </div>
          <div className="card-body" style={{ padding: '8px 16px' }}>
            {warnings.map(tk => {
              const ds = deadlineStatus(tk.deadline);
              return (
                <div
                  key={tk.id}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}
                >
                  <span style={{ color: 'var(--text-primary)' }}>{tk.title}</span>
                  <span style={{ color: ds === 'overdue' ? 'var(--danger)' : 'var(--warning)', fontWeight: 600, fontSize: 12 }}>
                    {ds === 'overdue' ? t('overdue') : t('deadline_warning')} ({timeLeft(tk.deadline, lang)})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="stats-grid">
        {STAT_CARDS.map(c => (
          <div key={c.key} className={`stat-card ${c.cls}`}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-value">{c.val}</div>
            <div className="stat-label">{t(c.key)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">{t('recent_tasks')}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{recent.length}</span>
          </div>
          <div style={{ padding: '0 16px' }}>
            {recent.length === 0 ? (
              <div className="empty" style={{ padding: '32px 0' }}>
                <div className="empty-icon">☑</div>
                <div className="empty-title">{t('no_tasks')}</div>
              </div>
            ) : recent.map((tk, i) => (
              <div
                key={tk.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 12 }}>{tk.title}</span>
                <StatusBadge status={tk.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">{t('status_dist')}</span>
          </div>
          <div className="card-body">
            {total === 0 ? (
              <div className="empty" style={{ padding: '24px 0' }}>
                <div className="empty-title">{t('no_tasks')}</div>
              </div>
            ) : statuses.filter(s => statusCounts[s]).map(s => {
              const pct = Math.round((statusCounts[s] || 0) / total * 100);
              return (
                <div key={s} className="bar-row" style={{ marginBottom: 10 }}>
                  <div className="bar-label">
                    <span className={`badge b-${s}`}>{t(`st_${s}`)}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{statusCounts[s]}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%`, background: statusColors[s] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
