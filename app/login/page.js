'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const { user, db, login, lang, setLang, t } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 200));
    const found = (db?.users || []).find(u =>
      u.email?.toLowerCase() === email.toLowerCase() &&
      u.password === password &&
      u.active !== false
    );
    if (found) {
      login(found);
      router.replace('/dashboard');
    } else {
      setError(t('err_login'));
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img
            src="https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png"
            alt="SmartPro"
            style={{ height: 40, objectFit: 'contain' }}
            onError={e => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <span className="logo-text" style={{ display:'none', fontSize:28, fontWeight:900 }}>SmartPro</span>
        </div>
        <div className="login-subtitle">{t('platform_name')}</div>

        <div className="login-lang">
          {['ka','en','ru'].map(l => (
            <button key={l} className={`lang-btn ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('email')}</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@smartpro.ge"
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">{t('password')}</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'11px' }} disabled={loading}>
            {loading ? <span className="spinner" style={{ width:16,height:16,borderWidth:2 }} /> : t('login_btn')}
          </button>
        </form>
      </div>
    </div>
  );
}
