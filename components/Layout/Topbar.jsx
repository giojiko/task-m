'use client';
import { useApp } from '@/context/AppContext';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { fdt } from '@/lib/utils';

const PAGE_TITLES = {
  '/dashboard':  { key: 'dashboard',   icon: '◫' },
  '/tasks':      { key: 'tasks',       icon: '☑' },
  '/clients':    { key: 'clients',     icon: '◉' },
  '/warehouse':  { key: 'warehouse',   icon: '⬡' },
  '/employees':  { key: 'employees',   icon: '◎' },
  '/directions': { key: 'directions',  icon: '⬡' },
  '/profile':    { key: 'my_account',  icon: '⊙' },
};

export default function Topbar() {
  const { lang, setLang, t, db, user } = useApp();
  const pathname = usePathname();
  const [showNotifs, setShowNotifs] = useState(false);

  const pageInfo = Object.entries(PAGE_TITLES).find(([path]) => pathname.startsWith(path))?.[1];

  const notifs = (db?.notifications || []).filter(n =>
    (n.forUsers || []).includes(user?.id)
  );
  const unread = notifs.filter(n => !n.read).length;

  const nearDeadline = (db?.tasks || []).filter(tk => {
    if (!tk.deadline || ['completed','stopped'].includes(tk.status)) return false;
    return new Date(tk.deadline).getTime() - Date.now() < 24 * 3600 * 1000;
  });

  const allNotifItems = [
    ...nearDeadline.map(tk => ({
      id: tk.id,
      type: new Date(tk.deadline) < new Date() ? 'deadline_overdue' : 'deadline_warning',
      taskTitle: tk.title,
      timeLabel: fdt(tk.deadline),
      read: false,
    })),
    ...notifs,
  ].slice(0, 10);

  const totalUnread = unread + nearDeadline.length;

  return (
    <header className="topbar">
      <div className="topbar-title">
        {pageInfo && (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{pageInfo.icon}</span>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span>{t(pageInfo.key)}</span>
          </>
        )}
      </div>

      <div className="topbar-actions">
        {['ka','en','ru'].map(l => (
          <button key={l} className={`lang-btn ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
            {l.toUpperCase()}
          </button>
        ))}

        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setShowNotifs(v => !v)}
            style={{ position: 'relative', fontSize: 15 }}
            title="შეტყობინებები"
          >
            🔔
            {totalUnread > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--danger)', color: '#fff',
                fontSize: 9, fontWeight: 700,
                width: 16, height: 16, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}>{totalUnread > 9 ? '9+' : totalUnread}</span>
            )}
          </button>

          {showNotifs && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setShowNotifs(false)}
              />
              <div className="notif-dropdown">
                <div className="notif-header">
                  <span>შეტყობინებები</span>
                  <button className="btn btn-ghost btn-xs" onClick={() => setShowNotifs(false)}>✕</button>
                </div>
                {allNotifItems.length === 0 ? (
                  <div className="notif-empty">შეტყობინება არ არის</div>
                ) : allNotifItems.map((n, i) => (
                  <div key={n.id || i} className={`notif-item ${n.read ? '' : 'unread'}`}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>
                      {n.type === 'deadline_overdue' ? '🔴' : '⚠️'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{n.taskTitle}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.timeLabel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
