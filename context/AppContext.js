'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { t as translate } from '@/lib/i18n';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [lang, setLangState] = useState('ka');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

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
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDb),
      });
    } catch (e) {
      console.error('saveDB failed', e);
    }
  }, []);

  useEffect(() => {
    const storedLang = localStorage.getItem('sp_lang') || 'ka';
    setLangState(storedLang);

    const sessionId = localStorage.getItem('spro_session');

    fetch('/api/db')
      .then(r => r.json())
      .then(data => {
        setDb(data);
        if (sessionId) {
          const u = (data.users || []).find(u => u.id === sessionId && u.active !== false);
          if (u) setUser(u);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((u) => {
    setUser(u);
    localStorage.setItem('spro_session', u.id);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('spro_session');
  }, []);

  const refreshUser = useCallback((updatedDb) => {
    if (!user) return;
    const fresh = (updatedDb.users || []).find(u => u.id === user.id);
    if (fresh) setUser(fresh);
  }, [user]);

  return (
    <AppContext.Provider value={{ user, setUser, db, saveDB, lang, setLang, t, loading, toast, login, logout, refreshUser }}>
      {children}
      <div id="toast" style={{ position:'fixed', bottom:20, right:20, zIndex:9999, display:'flex', flexDirection:'column', gap:7, pointerEvents:'none' }}>
        {toasts.map(x => (
          <div key={x.id} className={`ti show ${x.type}`} style={{ pointerEvents:'all' }}>{x.msg}</div>
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
