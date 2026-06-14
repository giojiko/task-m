'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const NAV = [
  { href: '/dashboard', icon: '📊', key: 'dashboard', roles: ['super_admin','admin','specialist'] },
  { href: '/tasks', icon: '✅', key: 'tasks', roles: ['super_admin','admin','specialist'] },
  { href: '/clients', icon: '👥', key: 'clients', roles: ['super_admin','admin'] },
  { href: '/warehouse', icon: '📦', key: 'warehouse', roles: ['super_admin','admin'] },
  { href: '/employees', icon: '👤', key: 'employees', roles: ['super_admin','admin'] },
  { href: '/directions', icon: '🗂', key: 'directions', roles: ['super_admin','admin','specialist'] },
  { href: '/profile', icon: '⚙️', key: 'settings', roles: ['super_admin','admin','specialist'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, t, db } = useApp();
  if (!user) return null;

  const dirs = db?.directions || [];

  return (
    <div className="sidebar">
      <div className="nav-sec">{t('menu')}</div>
      {NAV.filter(n => n.roles.includes(user.role)).map(n => (
        <Link key={n.href} href={n.href} className={`nav-item${pathname.startsWith(n.href) ? ' active' : ''}`}>
          <span>{n.icon}</span>
          <span>{t(n.key)}</span>
        </Link>
      ))}

      {(user.role === 'super_admin' || user.role === 'admin') && dirs.length > 0 && (
        <>
          <div className="nav-sec">{t('directions')}</div>
          {dirs.map(d => (
            <Link key={d.id} href={`/directions?dir=${d.id}`} className="dir-sub" style={{ borderLeft: `2px solid ${d.color}` }}>
              <span>{d.icon}</span>
              <span>{d.name}</span>
            </Link>
          ))}
        </>
      )}

      <div className="nav-sec">{t('account_nav')}</div>
      <Link href="/profile" className={`nav-item${pathname === '/profile' ? ' active' : ''}`}>
        <span>👤</span>
        <span>{t('my_account')}</span>
      </Link>
    </div>
  );
}
