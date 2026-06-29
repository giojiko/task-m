'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

const NAV = [
  { href: '/dashboard',  icon: '◫',  key: 'dashboard' },
  { href: '/tasks',      icon: '☑',  key: 'tasks' },
  { href: '/clients',    icon: '◉',  key: 'clients' },
  { href: '/warehouse',  icon: '⬡',  key: 'warehouse' },
  { href: '/employees',  icon: '◎',  key: 'employees' },
  { href: '/directions', icon: '⬡',  key: 'directions' },
  { href: '/invoice',    icon: '🧾', key: 'invoice' },
  { href: '/passports',  icon: '🔖', key: 'passports' },
];

// მობილურზე ქვედა bar-ში 4 მთავარი + "მეტი"
const MOBILE_MAIN = ['/dashboard', '/tasks', '/clients', '/invoice'];

export default function Sidebar() {
  const pathname = usePathname();
  const { db, user, t, lang, setLang, logout } = useApp();
  const [dirsOpen, setDirsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // "მეტი" drawer-ი route-ის შეცვლისას ვხურავთ
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // scroll lock when drawer open
  useEffect(() => {
    if (moreOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [moreOpen]);

  const navItems = NAV.filter(item => {
    if (user?.role === 'specialist' && item.key === 'employees') return false;
    return true;
  });

  const isActive = (href) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const dirs = db?.directions || [];

  return (
    <>
      {/* ══════════════════════════════════
          Desktop sidebar (≥ 769px)
      ══════════════════════════════════ */}
      <aside className="sidebar desktop-sidebar">
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
          {navItems.map(item => {
            if (item.key === 'directions') {
              const active = pathname.startsWith('/directions');
              const activeParam = typeof window !== 'undefined'
                ? new URLSearchParams(window.location.search).get('dir')
                : null;
              return (
                <div key="directions">
                  <button
                    className={`nav-item ${active ? 'active' : ''}`}
                    onClick={() => setDirsOpen(v => !v)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{t(item.key)}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {dirsOpen ? '▲' : '▼'}
                    </span>
                  </button>
                  {dirsOpen && (
                    <div className="nav-sub">
                      <Link
                        href="/directions"
                        className={`nav-dir-sub ${pathname === '/directions' && !activeParam ? 'active' : ''}`}
                      >
                        <span>⬡</span>
                        <span style={{ flex: 1 }}>ყველა მიმართულება</span>
                      </Link>
                      <Link
                        href="/directions?dir=online"
                        className={`nav-dir-sub ${activeParam === 'online' ? 'active' : ''}`}
                        style={{ color: activeParam === 'online' ? '#F59E0B' : undefined }}
                      >
                        <span>🛒</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ონლაინ გაყიდვა
                        </span>
                      </Link>
                      <div style={{ borderTop: '1px solid var(--border)', margin: '3px 4px' }} />
                      {dirs.map(d => (
                        <Link
                          key={d.id}
                          href={`/directions?dir=${d.id}`}
                          className={`nav-dir-sub ${activeParam === d.id ? 'active' : ''}`}
                          style={{ color: activeParam === d.id ? d.color : undefined }}
                        >
                          <span>{d.icon}</span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const badge = item.key === 'tasks' && (db?.tasks || []).filter(tk =>
              tk.deadline && !['completed','stopped'].includes(tk.status) &&
              new Date(tk.deadline).getTime() - Date.now() < 24 * 3600 * 1000
            ).length > 0
              ? <span className="nav-badge warn">
                  {(db?.tasks || []).filter(tk =>
                    tk.deadline && !['completed','stopped'].includes(tk.status) &&
                    new Date(tk.deadline).getTime() - Date.now() < 24 * 3600 * 1000
                  ).length}
                </span>
              : null;

            return (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
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
            <div className="avatar">{user?.firstName?.[0] || user?.name?.[0] || '?'}{user?.lastName?.[0] || ''}</div>
            <div className="user-info">
              <div className="user-name">{`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name}</div>
              <div className="user-role">
                {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Specialist'}
              </div>
            </div>
          </Link>
          <button className="logout-btn" onClick={logout} title={t('logout')}>⎋</button>
        </div>
      </aside>

      {/* ══════════════════════════════════
          Mobile bottom tab bar (≤ 768px)
      ══════════════════════════════════ */}
      <nav className="mobile-bottom-nav">
        {MOBILE_MAIN.map(href => {
          const item = NAV.find(n => n.href === href);
          if (!item) return null;
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={`mob-tab ${active ? 'active' : ''}`}>
              <span className="mob-tab-icon">{item.icon}</span>
              <span className="mob-tab-label">{t(item.key)}</span>
            </Link>
          );
        })}

        <button
          className={`mob-tab ${moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(v => !v)}
        >
          <span className="mob-tab-icon">⋯</span>
          <span className="mob-tab-label">მეტი</span>
        </button>
      </nav>

      {/* ══════════════════════════════════
          "მეტი" Drawer (bottom sheet)
      ══════════════════════════════════ */}
      {moreOpen && (
        <>
          <div className="mob-drawer-overlay" onClick={() => setMoreOpen(false)} />

          <div className="mob-drawer">
            <div className="mob-drawer-handle" />

            <Link href="/profile" className="mob-drawer-user" onClick={() => setMoreOpen(false)}>
              <div className="avatar"
                style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 14,
                  width: 40, height: 40, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {user?.firstName?.[0] || user?.name?.[0] || '?'}{user?.lastName?.[0] || ''}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                  {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--accent)' }}>პროფილის ნახვა →</div>
              </div>
            </Link>

            <div className="mob-drawer-divider" />

            <div className="mob-drawer-grid">
              {navItems.filter(item => !MOBILE_MAIN.includes(item.href)).map(item => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    className={`mob-drawer-item ${active ? 'active' : ''}`}>
                    <span className="mob-drawer-icon">{item.icon}</span>
                    <span className="mob-drawer-label">{t(item.key)}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mob-drawer-divider" />

            <div style={{ display: 'flex', gap: 8, padding: '0 4px 4px' }}>
              {['ka','en','ru'].map(l => (
                <button key={l} onClick={() => { setLang(l); setMoreOpen(false); }}
                  style={{
                    flex: 1, padding: '10px 0', border: 'none', borderRadius: 10,
                    background: lang === l ? 'var(--accent)' : 'var(--bg-muted)',
                    color: lang === l ? '#000' : 'var(--text-secondary)',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '.05em',
                  }}>
                  {l}
                </button>
              ))}
            </div>

            <button
              onClick={logout}
              style={{
                width: '100%', marginTop: 10, padding: '12px 0', border: 'none', borderRadius: 10,
                background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              ⎋ {t('logout')}
            </button>
          </div>
        </>
      )}
    </>
  );
}
