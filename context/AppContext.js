'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { t as translate } from '@/lib/i18n';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [dbMeta, setDbMeta] = useState({ updated: null });
  const [lang, setLangState] = useState('ka');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);
  const router = useRouter();

  const t = useCallback((key) => translate(key, lang), [lang]);

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem('sp_lang', l);
  };

  const toast = useCallback((msg, type = 'success') => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 3500);
  }, []);

  const saveDB = useCallback(async (newDb) => {
    setDb(newDb);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...newDb, _expectedUpdated: dbMeta.updated }),
      });
      if (res.status === 409) {
        toast('⚠️ მონაცემები შეიცვალა სხვის მიერ — გვერდი განახლდება', 'warning');
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      if (res.status === 401) {
        setUser(null);
        router.push('/login');
        return;
      }
      const result = await res.json();
      if (result.updated) setDbMeta({ updated: result.updated });
    } catch (e) {
      console.error('saveDB failed', e);
    }
  }, [router, dbMeta.updated, toast]);

  useEffect(() => {
    const storedLang = localStorage.getItem('sp_lang') || 'ka';
    setLangState(storedLang);

    let sessionUser = null;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(({ user: u }) => {
        sessionUser = u;
        setUser(u);
        return fetch('/api/db', { credentials: 'include', cache: 'no-store' });
      })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          const { _updated, ...rest } = data;
          setDb(rest);
          setDbMeta({ updated: _updated || null });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    let res;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
    } catch (e) {
      return { error: 'სერვერთან კავშირი ვერ დამყარდა — სცადეთ მოგვიანებით' };
    }
    let data;
    try {
      data = await res.json();
    } catch (e) {
      return { error: `სერვერის შეცდომა (კოდი ${res.status}) — ადმინისტრატორს მიმართეთ` };
    }
    if (!res.ok) return { error: data.error || 'შესვლა ვერ მოხერხდა' };
    setUser(data.user);
    const dbRes = await fetch('/api/db', { credentials: 'include', cache: 'no-store' });
    if (dbRes.ok) {
      const dbData = await dbRes.json();
      const { _updated, ...rest } = dbData;
      setDb(rest);
      setDbMeta({ updated: _updated || null });
    }
    return { user: data.user };
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setDb(null);
    router.push('/login');
  }, [router]);

  const refreshUser = useCallback((updatedDb) => {
    if (!user) return;
    const fresh = (updatedDb.users || []).find(u => u.id === user.id);
    if (fresh) {
      const { password: _p, passwordHash: _ph, ...safe } = fresh;
      setUser(safe);
    }
  }, [user]);

  return (
    <AppContext.Provider value={{ user, setUser, db, saveDB, lang, setLang, t, loading, toast, login, logout, refreshUser }}>
      {children}
      <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
        {toasts.map(x => (
          <div key={x.id} className={`toast ${x.type}`} style={{ pointerEvents:'all' }}>{x.msg}</div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
