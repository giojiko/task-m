'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useState } from 'react';

const NAV = [
  { href: '/dashboard', icon: '📊', key: 'dashboard' },
  { href: '/tasks',     icon: '✅', key: 'tasks' },
  { href: '/clients',   icon: '👥', key: 'clients' },
  { href: '/warehouse', icon: '📦', key: 'warehouse' },
  { href: '/employees', icon: '👤', key: 'employees' },
  { href: '/directions',icon: '🏢', key: 'directions' },
];

export default function Sidebar() {
  const { user, db, t, logout } = useApp();
  const pathname = usePathname();
  const [dirsOpen, setDirsOpen] = useState(false);

  const initials = user ? (user.firstName?.[0] || '') + (user.lastName?.[0] || '') : '?';
  const roleName = { super_admin: 'Super Admin', admin: 'ადმინი', specialist: 'სპეციალისტი' }[user?.role] || '';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img
          src="https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png"
          alt="SmartPro"
          onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
        />
        <span className="logo-text" style={{ display:'none' }}>SmartPro</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">{t('menu')}</div>

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
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{t(item.key)}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{dirsOpen ? '▲' : '▼'}</span>
                </button>
                {dirsOpen && (
                  <div className="nav-sub">
                    {(db?.directions || []).map(d => (
                      <Link
                        key={d.id}
                        href={`/directions?dir=${d.id}`}
                        className={`nav-item ${pathname.startsWith('/directions') && typeof window !== 'undefined' && window.location.search.includes(d.id) ? 'active' : ''}`}
                      >
                        <span className="nav-icon" style={{ fontSize: 12 }}>{d.icon}</span>
                        <span className="nav-label" style={{ fontSize: 12 }}>{d.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{t(item.key)}</span>
            </Link>
          );
        })}

        <div className="nav-section" style={{ marginTop: 8 }}>{t('account_nav')}</div>
        <Link href="/profile" className={`nav-item ${pathname === '/profile' ? 'active' : ''}`}>
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">{t('my_account')}</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.firstName} {user?.lastName}</div>
            <div className="user-role">{roleName}</div>
          </div>
          <button
            onClick={logout}
            title={t('logout')}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:16, padding:'2px' }}
          >→</button>
        </div>
      </div>
    </aside>
  );
}
