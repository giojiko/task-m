'use client';
// Switches & Sockets — the working prototype (public/switches-app/index.html) shown 1:1 inside the system.
// The prototype keeps its own look and behaviour; this page only gives it the data from the store
// (db.switchPrices, db.switchSettings, db.switchQuotes) and saves its changes back with saveDB.
import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import AppShell from '@/components/Layout/AppShell';
import seedData from '@/lib/switch-prices-seed.json';

// fields of the settings that any user may change (automatic exchange rate)
const RATE_FIELDS = ['usd', 'cny', 'rateAt', 'rateErr'];

export default function SwitchesPage() {
  const { db, dbRef, saveDB, user } = useApp();
  const frameRef = useRef(null);
  const queue = useRef([]);
  const timer = useRef(null);
  const role = user?.role || 'specialist';

  // seed supplier prices once, when the store has none
  useEffect(() => {
    const cur = dbRef?.current || db;
    if (!cur) return;
    const have = cur.switchPrices || {};
    // add products that are new in the seed (for example new intermediate switches) without touching entered prices
    const missing = Object.keys(seedData).filter(id => !have[id]
      || (have[id].weight == null && seedData[id].weight != null)
      || ((have[id].price == null || have[id].price === '') && seedData[id].price != null));
    if (missing.length) {
      const next = { ...have };
      for (const id of missing) next[id] = { ...seedData[id], ...(have[id] || {}), weight: have[id]?.weight ?? seedData[id].weight, price: (have[id]?.price != null && have[id]?.price !== '') ? have[id].price : seedData[id].price };
      saveDB({ ...cur, switchPrices: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!db]);

  // apply queued writes in one saveDB call
  const flush = () => {
    const cur = dbRef?.current || db;
    if (!cur || !queue.current.length) return;
    const items = queue.current; queue.current = [];
    let prices = { ...(cur.switchPrices || {}) };
    let settings = { ...(cur.switchSettings || {}) };
    let quotes = [...(cur.switchQuotes || [])];
    for (const w of items) {
      if (w.coll === 'prices') {
        if (role !== 'super_admin' && role !== 'admin') continue;
        if (w.value == null) delete prices[w.id]; else prices[w.id] = w.value;
      } else if (w.coll === 'settings') {
        if (role === 'super_admin') settings = { ...w.value };
        else for (const k of RATE_FIELDS) if (k in (w.value || {})) settings[k] = w.value[k];
      } else if (w.coll === 'quotes') {
        const i = quotes.findIndex(q => q.id === w.id);
        if (w.value == null) { if (i > -1) quotes.splice(i, 1); continue; }
        const prev = i > -1 ? quotes[i] : null;
        const doc = { ...w.value, createdBy: prev?.createdBy ?? user?.id ?? null, createdByName: prev?.createdByName ?? ([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || null) };
        if (i > -1) quotes[i] = doc; else quotes.unshift(doc);
      }
    }
    saveDB({ ...cur, switchPrices: prices, switchSettings: settings, switchQuotes: quotes });
  };

  const sendInit = () => {
    const cur = dbRef?.current || db;
    const win = frameRef.current?.contentWindow;
    if (!cur || !win) return;
    win.postMessage({
      type: 'sp-init',
      role,
      user: { id: user?.id },
      prices: cur.switchPrices && Object.keys(cur.switchPrices).length ? cur.switchPrices : seedData,
      settings: cur.switchSettings || {},
      quotes: cur.switchQuotes || [],
    }, window.location.origin);
  };

  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow || !e.data) return;
      if (e.data.type === 'sp-ready') sendInit();
      if (e.data.type === 'sp-write') {
        queue.current.push(e.data);
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, 500);
      }
    };
    window.addEventListener('message', onMsg);
    return () => { window.removeEventListener('message', onMsg); clearTimeout(timer.current); flush(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, role]);

  // save pending changes before leaving the page
  useEffect(() => {
    const onLeave = () => flush();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      {!db ? (
        <div className="empty">იტვირთება...</div>
      ) : (
        <iframe
          ref={frameRef}
          src="/switches-app/index.html"
          title="ჩამრთველები და როზეტები"
          style={{
            display: 'block', width: '100%', border: 0, borderRadius: 8,
            height: 'calc(100dvh - var(--topbar-h, 52px) - 48px)', minHeight: 600, background: 'transparent',
          }}
        />
      )}
    </AppShell>
  );
}
