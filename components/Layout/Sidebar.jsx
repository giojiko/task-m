'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useState } from 'react';

const NAV = [
  { href: '/dashboard',  icon: '◫', key: 'dashboard' },
  { href: '/tasks',      icon: '☑', key: 'tasks' },
  { href: '/clients',    icon: '◉', key: 'clients' },
  { href: '/warehouse',  icon: '⬡', key: 'warehouse' },
  { href: '/employees',  icon: '◎', key: 'employees' },
  { href: '/directions', icon: '⬡', key: 'directions' },
];

export default function Sidebar() {
  const { user, db, t, logout } = useApp();
  const pathname = usePathname();
  const [dirsOpen, setDirsOpen] = useState(false);

  const initials = user
    ? (user.firstName?.[0] || user.name?.[0] || '?') + (user.lastName?.[0] || '')
    : '?';
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name : '';
  const roleLabel = { super_admin: 'Super Admin', admin: 'Admin', specialist: 'Specialist' }[user?.role] || '';

  const tasks = db?.tasks || [];
  const nearDeadline = tasks.filter(tk =>
    tk.deadline && !['completed','stopped'].includes(tk.status) &&
    new Date(tk.deadline).getTime() - Date.now() < 24 * 3600 * 1000
  ).length;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img
          src="https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png"
          alt="SmartPro"
          style={{ height: 26, objectFit: 'contain' }}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
        />
        <span className="logo-text" style={{ display: 'none' }}>SmartPro</span>
      </div>

      <nav className="sidebar-nav">
        {NAV.filter(item => {
          if (user?.role === 'specialist' && item.key === 'employees') return false;
          return true;
        }).map(item => {
          if (item.key === 'directions') {
            const isActive = pathname.startsWith('/directions');
            return (
              <div key="directions">
                <button
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setDirsOpen(v => !v)}
                >
                  <span className="nav-icon">⬡</span>
                  <span className="nav-label">{t(item.key)}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>{dirsOpen ? '▲' : '▼'}</span>
                </button>
                {dirsOpen && (
                  <div className="nav-sub">
                    {(db?.directions || []).map(d => (
                      <Link key={d.id} href={`/directions?dir=${d.id}`} className="nav-dir-sub">
                        <span>{d.icon}</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const isActive = item.key === 'dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);

          const badge = item.key === 'tasks' && nearDeadline > 0
            ? <span className="nav-badge warn">{nearDeadline}</span>
            : null;

          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{t(item.key)}</span>
              {badge}
            </Link>
          );
        })}

        <div style={{ borderTop: '1px solid var(--border)', margin: '8px 8px 0' }} />

        <Link href="/profile" className={`nav-item ${pathname === '/profile' ? 'active' : ''}`}>
          <span className="nav-icon">⊙</span>
          <span className="nav-label">{t('my_account')}</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <Link href="/profile" className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{displayName}</div>
            <div className="user-role">{roleLabel}</div>
          </div>
        </Link>
        <button className="logout-btn" onClick={logout} title={t('logout')}>⎋</button>
      </div>
    </aside>
  );
}
