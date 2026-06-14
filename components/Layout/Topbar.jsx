'use client';
import { useApp } from '@/context/AppContext';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

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
  const { lang, setLang, t, db } = useApp();
  const pathname = usePathname();
  const [notifCount, setNotifCount] = useState(0);

  const pageInfo = Object.entries(PAGE_TITLES).find(([path]) => pathname.startsWith(path))?.[1];

  useEffect(() => {
    if (!db?.tasks) return;
    const now = Date.now();
    const count = db.tasks.filter(tk => {
      if (!tk.deadline || ['completed','stopped'].includes(tk.status)) return false;
      return new Date(tk.deadline).getTime() - now < 24 * 3600 * 1000;
    }).length;
    setNotifCount(count);
  }, [db]);

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

        <button className="icon-btn" title="გაფრთხილებები" style={{ fontSize: 15 }}>
          🔔
          {notifCount > 0 && <span className="notif-dot" />}
        </button>
      </div>
    </header>
  );
}
