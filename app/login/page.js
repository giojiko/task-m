'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Logo from '@/components/Brand/Logo';

export default function LoginPage() {
  const { user, login, lang, setLang, t } = useApp();
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
    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      router.replace('/dashboard');
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Logo />
        </div>
        <p className="login-subtitle">{t('platform_name')}</p>

        <div className="login-lang">
          {['ka','en','ru'].map(l => (
            <button key={l} className={`lang-btn ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="login-divider" />

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
              autoComplete="email"
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
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            disabled={loading}
          >
            {loading
              ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              : t('login_btn')
            }
          </button>
        </form>

        <p className="login-footer">SmartPro Georgia &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
