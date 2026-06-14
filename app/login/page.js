'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const { user, db, loading, login, t } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const handleLogin = (e) => {
    e.preventDefault();
    setErr('');
    if (!db) return;
    const found = (db.users || []).find(
      u => u.email === email.trim() && u.password === pass && u.active !== false
    );
    if (!found) return setErr(t('err_login'));
    login(found);
    router.push('/dashboard');
  };

  if (loading) return null;

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div style={{ width:52, height:52, background:'linear-gradient(135deg,var(--accent-d),var(--accent))', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:'#fff' }}>SP</div>
            <div className="login-title">SmartPro</div>
            <div className="login-sub">{t('platform_name')}</div>
          </div>
        </div>
        {err && <div className="err-box" style={{ display:'block' }}>{err}</div>}
        <form onSubmit={handleLogin}>
          <div className="fg">
            <label>{t('email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="fg">
            <label>{t('password')}</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} />
          </div>
          <button type="submit" className="login-btn">{t('login_btn')}</button>
        </form>
        <div className="login-hint">
          <strong>{t('first_login')}</strong><br />
          admin@smartpro.ge / admin123
        </div>
      </div>
    </div>
  );
}
