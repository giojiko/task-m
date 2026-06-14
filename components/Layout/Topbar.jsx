'use client';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';

export default function Topbar() {
  const { user, lang, setLang, t, logout } = useApp();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user ? `${(user.firstName||user.name||'?')[0]}${(user.lastName||'')[0]||''}`.toUpperCase() : '?';

  return (
    <div className="topbar">
      <div className="tbar-left">
        <div className="tbar-logo">
          <div className="sp-mark">SP</div>
        </div>
        <div className="tbar-sep" />
        <div className="tbar-app">{t('app_label')}</div>
      </div>
      <div className="tbar-right">
        <div className="lang-switcher">
          {['ka','en','ru'].map(l => (
            <button key={l} className={`lang-btn${lang===l?' active':''}`} onClick={() => setLang(l)}>
              {l==='ka'?'ქარ':l==='en'?'ENG':'РУС'}
            </button>
          ))}
        </div>
        {user && (
          <div className="user-chip">
            <div className="av">{initials}</div>
            <div>
              <div className="uname">{user.firstName || user.name}</div>
              <span className={`rtag r-${user.role}`}>{t(`r_${user.role}`)}</span>
            </div>
          </div>
        )}
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>{t('logout')}</button>
      </div>
    </div>
  );
}
