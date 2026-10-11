'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import AppShell from '@/components/Layout/AppShell';
import Modal from '@/components/UI/Modal.jsx';
import ProductIcon from '@/components/Switches/ProductIcon.jsx';
import catalog from '@/lib/switch-catalog.json';
import seedData from '@/lib/switch-prices-seed.json';
import {
  lineCalc, offerTotals, offerNumber, costParts, productMarkup,
  DEFAULT_SWITCH_SETTINGS, num, roundUp,
} from '@/lib/switch-pricing.js';
import { uid } from '@/lib/utils';

/* ── helpers ──────────────────────────────────────────────── */
const TABS = [
  { key: 'compose',  label: '📋 შეთავაზების შედგენა' },
  { key: 'quotes',   label: '💾 შეთავაზებები' },
  { key: 'internal', label: '🔢 შიდა კალკულატორი',  roles: ['super_admin', 'admin'] },
  { key: 'prices',   label: '💰 ფასები და წონა',      roles: ['super_admin', 'admin'] },
  { key: 'settings', label: '⚙️ ხარჯების პარამეტრები', roles: ['super_admin'] },
];

const gel = (v) => v == null ? '—' : Number(v).toLocaleString('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₾';
const fmt2 = (v) => v == null ? '' : Number(v).toFixed(2);

function mergeWithSeed(existing, seed) {
  if (!existing || Object.keys(existing).length === 0) return { ...seed };
  const merged = { ...existing };
  for (const [id, sv] of Object.entries(seed)) {
    if (!merged[id]) {
      merged[id] = { ...sv };
    } else {
      merged[id] = {
        ...merged[id],
        price: sv.price,
        weight: sv.weight,
        pcs: sv.pcs,
        ctn: sv.ctn,
      };
    }
  }
  return merged;
}

/* build a flat lookup: id → item + series info */
const ITEMS_BY_ID = {};
const ALL_SERIES = catalog.series;
for (const s of ALL_SERIES) {
  for (const it of s.items) {
    ITEMS_BY_ID[it.id] = { ...it, seriesId: s.id, seriesName: s.name, seriesKa: s.ka };
  }
}

/* ── main page ────────────────────────────────────────────── */
export default function SwitchesPage() {
  const { db, dbRef, saveDB, toast, user } = useApp();
  const [tab, setTab] = useState('compose');

  /* seed on first load */
  useEffect(() => {
    if (!db) return;
    const cur = dbRef?.current || db;
    if (!cur.switchPrices || Object.keys(cur.switchPrices).length === 0) {
      const merged = mergeWithSeed(cur.switchPrices || {}, seedData);
      saveDB({ ...cur, switchPrices: merged });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!db]);

  const prices   = useMemo(() => db?.switchPrices   || {}, [db?.switchPrices]);
  const settings = useMemo(() => ({ ...DEFAULT_SWITCH_SETTINGS, ...(db?.switchSettings || {}) }), [db?.switchSettings]);
  const quotes   = useMemo(() => db?.switchQuotes   || [], [db?.switchQuotes]);

  const role = user?.role || 'specialist';
  const isAdmin = role === 'super_admin' || role === 'admin';
  const isSuperAdmin = role === 'super_admin';

  const visibleTabs = TABS.filter(t => !t.roles || t.roles.includes(role));

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">🔌 ჩამრთველები და როზეტები</div>
          <div className="page-subtitle">შეთავაზებები და კალკულაცია</div>
        </div>
      </div>

      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {visibleTabs.map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'compose'  && <ComposeTab  prices={prices} settings={settings} quotes={quotes} db={db} dbRef={dbRef} saveDB={saveDB} toast={toast} user={user} />}
      {tab === 'quotes'   && <QuotesTab   prices={prices} settings={settings} quotes={quotes} db={db} dbRef={dbRef} saveDB={saveDB} toast={toast} user={user} setTab={setTab} />}
      {tab === 'internal' && isAdmin   && <InternalTab  prices={prices} settings={settings} quotes={quotes} />}
      {tab === 'prices'   && isAdmin   && <PricesTab    prices={prices} db={db} dbRef={dbRef} saveDB={saveDB} toast={toast} />}
      {tab === 'settings' && isSuperAdmin && <SettingsTab settings={settings} db={db} dbRef={dbRef} saveDB={saveDB} toast={toast} />}
    </AppShell>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 1 — Compose offer
══════════════════════════════════════════════════════════ */
function ComposeTab({ prices, settings, quotes, db, dbRef, saveDB, toast, user }) {
  const [seriesId, setSeriesId] = useState(ALL_SERIES[0]?.id || '');
  const [colorId,  setColorId]  = useState('');
  const [lines,    setLines]    = useState([]);
  const [client,   setClient]   = useState({ name: '', project: '', note: '' });
  const [clientId, setClientId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [catalogModal, setCatalogModal] = useState(null); // series object
  const [catalogPage,  setCatalogPage]  = useState(null); // image src

  const series = ALL_SERIES.find(s => s.id === seriesId) || ALL_SERIES[0];
  const colors = series?.colors || [];

  useEffect(() => {
    if (colors.length && !colorId) setColorId(colors[0].id);
  }, [seriesId]);

  const currentColor = colors.find(c => c.id === colorId) || colors[0];
  const hex = currentColor?.hex || '#f3f3f1';

  const clients = useMemo(() => db?.clients || [], [db?.clients]);

  const handleClientPick = (id) => {
    setClientId(id);
    const c = clients.find(cl => cl.id === id);
    if (c) setClient(prev => ({ ...prev, name: c.name || c.c_name || '' }));
  };

  const qtyFor = (itemId) => lines.find(l => l.id === itemId && l.color === colorId)?.qty || 0;
  const setQty = (itemId, qty) => {
    const q = Math.max(0, parseInt(qty) || 0);
    setLines(prev => {
      const idx = prev.findIndex(l => l.id === itemId && l.color === colorId);
      if (q === 0) return prev.filter((_, i) => i !== idx);
      if (idx >= 0) return prev.map((l, i) => i === idx ? { ...l, qty: q } : l);
      return [...prev, { id: itemId, color: colorId, qty: q, sale: null, mk: null }];
    });
  };

  const setSaleLine = (itemId, val) => {
    setLines(prev => prev.map(l =>
      l.id === itemId && l.color === colorId ? { ...l, sale: val === '' ? null : val } : l
    ));
  };

  const totals = useMemo(() => offerTotals(prices, settings, lines), [prices, settings, lines]);

  const saveQuote = useCallback(async (printAfter = false) => {
    if (lines.length === 0) { toast('⚠️ დაამატეთ მინიმუམ ერთი პროდუქტი'); return; }
    const cur = dbRef?.current || db;
    const now = new Date();
    const q = {
      id: editingId || uid(),
      no: editingId ? (quotes.find(x => x.id === editingId)?.no || offerNumber(now)) : offerNumber(now),
      created: editingId ? (quotes.find(x => x.id === editingId)?.created || now.toISOString()) : now.toISOString(),
      updated: now.toISOString(),
      createdBy: user?.id || null,
      clientId: clientId || null,
      client: { ...client },
      lines: lines.map(l => ({ id: l.id, color: l.color, qty: l.qty, sale: l.sale, mk: l.mk })),
      cost: totals.cost,
      total: totals.total,
      profit: totals.profit,
    };
    const existing = cur.switchQuotes || [];
    const newQuotes = editingId
      ? existing.map(x => x.id === editingId ? q : x)
      : [...existing, q];
    await saveDB({ ...cur, switchQuotes: newQuotes });
    toast(editingId ? '✅ შეთავაზება განახლდა' : '✅ შეთავაზება შენახულია');
    if (!editingId) {
      setLines([]);
      setClient({ name: '', project: '', note: '' });
      setClientId('');
      setEditingId(null);
    }
    if (printAfter) printQuote(q, prices, settings);
  }, [lines, client, clientId, editingId, totals, quotes, db, dbRef, saveDB, toast, user]);

  const catalogPages = catalogModal ? Array.from({ length: 35 }, (_, i) => `/switch-catalog/pages/${i + 1}.webp`) : [];

  return (
    <div className="frow" style={{ gap: 16, alignItems: 'flex-start' }}>
      {/* LEFT — product picker */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Series selector */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ALL_SERIES.map(s => (
              <button key={s.id} className={`btn ${seriesId === s.id ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => { setSeriesId(s.id); setColorId(''); }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Series hero + colors */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {series?.img && (
              <img src={series.img} alt={series.name} style={{ height: 64, borderRadius: 8, objectFit: 'cover', cursor: 'pointer' }} onClick={() => setCatalogModal(series)} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{series?.ka}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{series?.desc}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setCatalogModal(series)}>📖 ფოტო კატალოგი</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {colors.map(c => (
              <button key={c.id} onClick={() => setColorId(c.id)}
                title={c.ka}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: c.hex, border: `3px solid ${colorId === c.id ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer', flexShrink: 0,
                }} />
            ))}
            {currentColor && <span style={{ color: 'var(--text-secondary)', fontSize: 13, alignSelf: 'center' }}>{currentColor.ka}</span>}
          </div>
        </div>

        {/* Items */}
        {(['module', 'frame']).map(kind => {
          const items = (series?.items || []).filter(it => it.kind === kind);
          if (!items.length) return null;
          return (
            <div key={kind} className="card" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>
                {kind === 'frame' ? 'ჩარჩოები' : 'მოდულები'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(it => {
                  const p = prices[it.id];
                  const up = p ? (p.colors?.[colorId] != null ? parseFloat(p.colors[colorId]) : parseFloat(p.price)) : null;
                  if (up == null) return null;
                  const qty = qtyFor(it.id);
                  const line = lines.find(l => l.id === it.id && l.color === colorId);
                  const lc = line ? lineCalc(prices, settings, line) : null;
                  return (
                    <div key={it.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ flexShrink: 0 }}>
                        <ProductIcon type={it.icon} hex={hex} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13 }}>{it.ka}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{it.code}</div>
                      </div>
                      {lc?.sale != null && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {gel(lc.sale)}
                        </div>
                      )}
                      <input type="number" min="0" value={qty || ''}
                        onChange={e => setQty(it.id, e.target.value)}
                        placeholder="0"
                        style={{ width: 64, textAlign: 'center' }}
                        className="input"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* RIGHT — offer panel */}
      <div style={{ width: 320, flexShrink: 0 }}>
        {editingId && (
          <div style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
            ✏️ რედაქტირდება № {quotes.find(q => q.id === editingId)?.no}
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => { setEditingId(null); setLines([]); setClient({ name: '', project: '', note: '' }); setClientId(''); }}>
              გაუქმება
            </button>
          </div>
        )}

        {/* Client */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>კლიენტი</div>
          <select className="input" style={{ marginBottom: 6 }} value={clientId} onChange={e => handleClientPick(e.target.value)}>
            <option value="">— კლიენტი (არჩევითი) —</option>
            {(db?.clients || []).map(c => <option key={c.id} value={c.id}>{c.name || c.c_name}</option>)}
          </select>
          <input className="input" placeholder="სახელი / კომპანია" style={{ marginBottom: 6 }} value={client.name} onChange={e => setClient(p => ({ ...p, name: e.target.value }))} />
          <input className="input" placeholder="პროექტი / ობიექტი" style={{ marginBottom: 6 }} value={client.project} onChange={e => setClient(p => ({ ...p, project: e.target.value }))} />
          <textarea className="input" placeholder="შენიშვნა" rows={2} value={client.note} onChange={e => setClient(p => ({ ...p, note: e.target.value }))} />
        </div>

        {/* Lines */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>შეთავაზება კლიენტისთვის</div>
          {lines.length === 0
            ? <div className="empty" style={{ padding: '16px 0' }}>პროდუქტი არ არის</div>
            : lines.map((l, i) => {
              const it = ITEMS_BY_ID[l.id];
              const lc = lineCalc(prices, settings, l);
              return (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                    {it?.ka} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{l.color} × {l.qty}</span>
                  </div>
                  <input type="number" step="0.01" className="input"
                    value={l.sale ?? ''}
                    onChange={e => setSaleLine(l.id, e.target.value)}
                    placeholder={lc.sale != null ? fmt2(lc.sale) : '—'}
                    title="ფასი (ხელით)"
                    style={{ width: 80, textAlign: 'right', color: l.sale != null ? 'var(--gold, #c8ad83)' : undefined }}
                  />
                  <div style={{ width: 70, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
                    {lc.sale != null ? gel(lc.sale * l.qty) : '—'}
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }}
                    onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}>🗑</button>
                </div>
              );
            })
          }
          {lines.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
              <span>სულ</span>
              <span>{gel(totals.total)}</span>
            </div>
          )}
          {totals.missing > 0 && (
            <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>⚠️ {totals.missing} პოზიციას ფასი არ აქვს</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => saveQuote(false)}>💾 შენახვა</button>
          <button className="btn btn-ghost" onClick={() => saveQuote(true)}>🖨 ბეჭდვა</button>
        </div>
      </div>

      {/* Catalog modal */}
      {catalogModal && (
        <Modal onClose={() => { setCatalogModal(null); setCatalogPage(null); }}>
          <div style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{catalogModal.ka} — კატალოგი</div>
            {catalogPage ? (
              <div style={{ textAlign: 'center' }}>
                <img src={catalogPage} alt="catalog page" style={{ maxWidth: '100%', borderRadius: 8, cursor: 'zoom-in' }} />
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setCatalogPage(null)}>← უკან</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                {catalogPages.map((src, i) => (
                  <img key={i} src={src} alt={`გვ. ${i + 1}`} style={{ width: '100%', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)' }}
                    onClick={() => setCatalogPage(src)} />
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 2 — Saved quotes
══════════════════════════════════════════════════════════ */
function QuotesTab({ prices, settings, quotes, db, dbRef, saveDB, toast, user, setTab }) {
  const [search, setSearch] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [delConfirm2, setDelConfirm2] = useState(false);

  const employees = useMemo(() => db?.users || db?.employees || [], [db]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...quotes].sort((a, b) => new Date(b.updated) - new Date(a.updated)).filter(qt =>
      !q || qt.no.toLowerCase().includes(q) || (qt.client?.name || '').toLowerCase().includes(q)
    );
  }, [quotes, search]);

  const deleteQuote = async (id) => {
    const cur = dbRef?.current || db;
    await saveDB({ ...cur, switchQuotes: (cur.switchQuotes || []).filter(q => q.id !== id) });
    toast('🗑 შეთავაზება წაიშალა');
    setConfirmDel(null);
    setDelConfirm2(false);
  };

  const openEdit = (q) => {
    // pass editing state through navigation — simpler to open ComposeTab with edit data via parent
    // For now open compose tab and set lines via custom event approach is complex;
    // Instead we'll expose editing inline below within this tab
  };

  const createInvoice = (q) => {
    const items = q.lines.map(l => {
      const it = ITEMS_BY_ID[l.id];
      const lc = lineCalc(prices, settings, l);
      return { name: `${it?.ka || l.id} (${it?.code || ''}, ${l.color})`, qty: l.qty, price: lc.sale != null ? lc.sale : 0 };
    });
    // store pending invoice in sessionStorage for invoice page to pick up
    try {
      sessionStorage.setItem('pendingInvoice', JSON.stringify({
        clientId: q.clientId || null,
        clientName: q.client?.name || '',
        note: `შეთავაზება ${q.no}`,
        items,
      }));
    } catch {}
    window.location.href = '/invoice?fromSwitch=1';
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <input className="input" placeholder="🔍 ძიება..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
      </div>

      {filtered.length === 0
        ? <div className="empty">შეთავაზებები ვერ მოიძებნა</div>
        : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>კლიენტი</th>
                  <th>პოზიციები</th>
                  <th>სულ</th>
                  <th>ვინ შეადგინა</th>
                  <th>თარიღი</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const emp = employees.find(e => e.id === q.createdBy);
                  return (
                    <tr key={q.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{q.no}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{q.client?.name || '—'}</div>
                        {q.client?.project && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{q.client.project}</div>}
                      </td>
                      <td>{q.lines?.length || 0} ცალი</td>
                      <td style={{ fontWeight: 700 }}>{gel(q.total)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>{q.updated ? new Date(q.updated).toLocaleDateString('ka-GE') : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" title="ბეჭდვა" onClick={() => printQuote(q, prices, settings)}>🖨</button>
                          <button className="btn btn-ghost btn-sm" title="ინვოისის შექმნა" onClick={() => createInvoice(q)}>🧾</button>
                          <button className="btn btn-danger btn-sm"
                            onClick={() => { if (confirmDel === q.id && delConfirm2) { deleteQuote(q.id); } else if (confirmDel === q.id) { setDelConfirm2(true); } else { setConfirmDel(q.id); setDelConfirm2(false); } }}
                          >
                            {confirmDel === q.id ? (delConfirm2 ? '⚠️ დადასტ.' : 'დარწმ.?') : '🗑'}
                          </button>
                          {confirmDel === q.id && (
                            <button className="btn btn-ghost btn-sm" onClick={() => { setConfirmDel(null); setDelConfirm2(false); }}>✕</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 3 — Internal calculator (admin+)
══════════════════════════════════════════════════════════ */
function InternalTab({ prices, settings, quotes }) {
  const [openId, setOpenId] = useState(null);
  const openQuote = openId ? quotes.find(q => q.id === openId) : null;

  const totals = useMemo(() => {
    if (!openQuote) return null;
    return offerTotals(prices, settings, openQuote.lines);
  }, [openQuote, prices, settings]);

  return (
    <div>
      {!openQuote ? (
        <>
          {quotes.length === 0
            ? <div className="empty">შეთავაზებები არ არის</div>
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>№</th><th>კლიენტი</th><th>სულ</th><th>თარიღი</th><th></th></tr>
                  </thead>
                  <tbody>
                    {[...quotes].sort((a, b) => new Date(b.updated) - new Date(a.updated)).map(q => (
                      <tr key={q.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{q.no}</td>
                        <td>{q.client?.name || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{gel(q.total)}</td>
                        <td style={{ fontSize: 12 }}>{q.updated ? new Date(q.updated).toLocaleDateString('ka-GE') : '—'}</td>
                        <td><button className="btn btn-ghost btn-sm" onClick={() => setOpenId(q.id)}>გახსნა →</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </>
      ) : (
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => setOpenId(null)}>← სია</button>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            შეთავაზება {openQuote.no} — {openQuote.client?.name || '—'}
          </div>

          {totals && (
            <div className="stats-grid" style={{ marginBottom: 16 }}>
              {[
                { label: 'თვითღირებულება სულ', val: gel(totals.cost),        icon: '💰', color: 'stat-blue' },
                { label: 'კლიენტის ფასი სულ',  val: gel(totals.total),       icon: '💳', color: 'stat-green' },
                { label: 'მოგება სულ',          val: gel(totals.profit),      icon: '📈', color: totals.profit >= 0 ? 'stat-green' : 'stat-red' },
                { label: 'საშუალო ნამატი',      val: totals.avgMarkup.toFixed(1) + '%', icon: '%', color: 'stat-yellow' },
                { label: 'მოგების წილი',        val: totals.marginShare.toFixed(1) + '%', icon: '🎯', color: 'stat-yellow' },
              ].map(c => (
                <div key={c.label} className={`stat-card ${c.color}`}>
                  <div className="stat-icon">{c.icon}</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>{c.val}</div>
                  <div className="stat-label">{c.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ხატულა</th>
                  <th>დასახელება</th>
                  <th>ფერი</th>
                  <th>რაოდენობა</th>
                  <th>ქარხ. ფასი</th>
                  <th>წონა გ</th>
                  <th>თვითღირ.</th>
                  <th>ნამატი</th>
                  <th>ფასი</th>
                  <th>მოგება 1 ც.</th>
                  <th>სულ</th>
                  <th>მოგ. წილი</th>
                </tr>
              </thead>
              <tbody>
                {openQuote.lines.map((l, i) => {
                  const it = ITEMS_BY_ID[l.id];
                  const lc = lineCalc(prices, settings, l);
                  const cp = lc.parts;
                  const col = (openQuote.lines[i].color);
                  const colorHex = ALL_SERIES.flatMap(s => s.colors).find(c => c.id === col)?.hex || '#ccc';
                  return (
                    <tr key={i}>
                      <td><ProductIcon type={it?.icon || 'blank'} hex={colorHex} size={24} /></td>
                      <td>
                        <div style={{ fontSize: 13 }}>{it?.ka || l.id}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{it?.code}</div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: colorHex, border: '1px solid var(--border)', verticalAlign: 'middle', marginRight: 4 }} />
                        {col}
                      </td>
                      <td style={{ textAlign: 'right' }}>{l.qty}</td>
                      <td style={{ textAlign: 'right', fontSize: 12 }}>{cp ? (settings.currency === 'CNY' ? '¥' : '$') + cp.price?.toFixed(2) : '—'}</td>
                      <td style={{ textAlign: 'right', fontSize: 12 }}>{cp ? cp.weightGrams : '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{lc.cost != null ? gel(lc.cost) : '—'}</td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: lc.manual ? 'var(--gold, #c8ad83)' : undefined }}>
                        {lc.manual ? `${lc.effectiveMarkup?.toFixed(1)}% *` : `${lc.markup?.toFixed(1)}%`}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: lc.manual ? 'var(--gold, #c8ad83)' : undefined }}>{lc.sale != null ? gel(lc.sale) : '—'}</td>
                      <td style={{ textAlign: 'right' }}>{lc.profitPerUnit != null ? gel(lc.profitPerUnit) : '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{lc.sale != null ? gel(lc.sale * l.qty) : '—'}</td>
                      <td style={{ textAlign: 'right', fontSize: 12 }}>
                        {lc.cost && lc.sale ? ((lc.profitPerUnit / lc.sale) * 100).toFixed(1) + '%' : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 4 — Prices & weights (admin+)
══════════════════════════════════════════════════════════ */
function PricesTab({ prices, db, dbRef, saveDB, toast }) {
  const [search, setSearch]     = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [editing, setEditing]   = useState({}); // id → { price, weight, markup, colors:{...} }
  const [saving, setSaving]     = useState(false);

  const allItems = useMemo(() => {
    return ALL_SERIES.flatMap(s =>
      s.items.map(it => ({ ...it, series: s }))
    ).filter(it => {
      if (seriesId && it.series.id !== seriesId) return false;
      if (search) {
        const q = search.toLowerCase();
        return it.ka.toLowerCase().includes(q) || it.code.toLowerCase().includes(q) || it.id.includes(q);
      }
      return true;
    });
  }, [search, seriesId]);

  const getVal = (id, field) => {
    if (editing[id]?.[field] !== undefined) return editing[id][field];
    return prices[id]?.[field] ?? '';
  };

  const setVal = (id, field, value) => {
    setEditing(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const saveAll = async () => {
    setSaving(true);
    const cur = dbRef?.current || db;
    const newPrices = { ...(cur.switchPrices || {}) };
    for (const [id, changes] of Object.entries(editing)) {
      newPrices[id] = { ...(newPrices[id] || {}), ...changes };
    }
    await saveDB({ ...cur, switchPrices: newPrices });
    setEditing({});
    toast('✅ ფასები შენახულია');
    setSaving(false);
  };

  const changed = Object.keys(editing).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="🔍 ძიება..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
        <select className="input" style={{ width: 160 }} value={seriesId} onChange={e => setSeriesId(e.target.value)}>
          <option value="">ყველა სერია</option>
          {ALL_SERIES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {changed > 0 && (
          <button className="btn btn-primary btn-sm" onClick={saveAll} disabled={saving}>
            {saving ? '...' : `💾 შენახვა (${changed})`}
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>სერია</th>
              <th>ხატულა</th>
              <th>დასახელება / კოდი</th>
              <th>ფასი ($)</th>
              <th>წონა (გ)</th>
              <th>ნამატი %</th>
              <th>ოქრო ($)</th>
              <th>ყუთი</th>
            </tr>
          </thead>
          <tbody>
            {allItems.map(it => {
              const colorHex = it.series.colors[0]?.hex || '#f3f3f1';
              return (
                <tr key={it.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{it.series.name}</td>
                  <td><ProductIcon type={it.icon} hex={colorHex} size={24} /></td>
                  <td>
                    <div style={{ fontSize: 13 }}>{it.ka}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{it.code}</div>
                  </td>
                  <td>
                    <input className="input" type="number" step="0.01" style={{ width: 80 }}
                      value={getVal(it.id, 'price')}
                      onChange={e => setVal(it.id, 'price', e.target.value)} />
                  </td>
                  <td>
                    <input className="input" type="number" style={{ width: 70 }}
                      value={getVal(it.id, 'weight')}
                      onChange={e => setVal(it.id, 'weight', e.target.value)} />
                  </td>
                  <td>
                    <input className="input" type="number" step="0.1" style={{ width: 70 }}
                      value={getVal(it.id, 'markup')}
                      placeholder="—"
                      onChange={e => setVal(it.id, 'markup', e.target.value === '' ? null : e.target.value)} />
                  </td>
                  <td>
                    <input className="input" type="number" step="0.01" style={{ width: 80 }}
                      value={(() => { const e = editing[it.id]?.colors?.gold; return e !== undefined ? e : (prices[it.id]?.colors?.gold ?? ''); })()}
                      placeholder="—"
                      onChange={e => setVal(it.id, 'colors', { ...(editing[it.id]?.colors || prices[it.id]?.colors || {}), gold: e.target.value === '' ? undefined : e.target.value })} />
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{prices[it.id]?.ctn || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 5 — Cost settings (super_admin)
══════════════════════════════════════════════════════════ */
function SettingsTab({ settings, db, dbRef, saveDB, toast }) {
  const [form, setForm] = useState({ ...settings });
  const [loadingRate, setLoadingRate] = useState(false);

  useEffect(() => { setForm({ ...settings }); }, [settings]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fetchRates = async () => {
    setLoadingRate(true);
    try {
      const res = await fetch('/api/rates');
      const data = await res.json();
      if (data.USD) {
        const rateVal = form.rateType === 'nbg' ? data.USD.nbg : data.USD.sell;
        set('usd', rateVal);
        set('rateAt', data.at);
        toast(`✅ კურსი განახლდა: $1 = ₾${rateVal}`);
      }
    } catch {
      toast('⚠️ კურსის ჩამოტვირთვა ვერ მოხერხდა');
    }
    setLoadingRate(false);
  };

  const save = async () => {
    const cur = dbRef?.current || db;
    await saveDB({ ...cur, switchSettings: { ...form } });
    toast('✅ პარამეტრები შენახულია');
  };

  // example calc
  const exampleItem = { id: 'B1~m~B1-10', color: 'white', qty: 1, sale: null, mk: null };
  const examplePrices = db?.switchPrices || {};
  const exLc = lineCalc(examplePrices, form, exampleItem);

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>კურსი</div>
        <div className="frow" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13 }}>ვალუტა:
            <select className="input" style={{ marginLeft: 6 }} value={form.currency} onChange={e => set('currency', e.target.value)}>
              <option value="USD">USD $</option>
              <option value="CNY">CNY ¥</option>
            </select>
          </label>
          <label style={{ fontSize: 13 }}>კურსი ($):
            <input type="number" step="0.0001" className="input" style={{ marginLeft: 6, width: 90 }} value={form.usd} onChange={e => set('usd', e.target.value)} />
          </label>
          <label style={{ fontSize: 13 }}>კურსი (¥):
            <input type="number" step="0.0001" className="input" style={{ marginLeft: 6, width: 90 }} value={form.cny} onChange={e => set('cny', e.target.value)} />
          </label>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={!!form.autoRate} onChange={e => set('autoRate', e.target.checked)} style={{ marginRight: 4 }} />
            ავტო კურსი
          </label>
          <label style={{ fontSize: 13 }}>ტიპი:
            <select className="input" style={{ marginLeft: 6 }} value={form.rateType} onChange={e => set('rateType', e.target.value)}>
              <option value="sell">Sell (kursi.ge)</option>
              <option value="nbg">NBG</option>
            </select>
          </label>
          <button className="btn btn-ghost btn-sm" onClick={fetchRates} disabled={loadingRate}>
            {loadingRate ? '...' : '🔄 განახლება'}
          </button>
          {form.rateAt && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(form.rateAt).toLocaleTimeString('ka-GE')}</span>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>ხარჯები</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { key: 'freight', label: 'გადაზიდვა ($/კგ)', step: '0.01' },
            { key: 'bank',    label: 'ბანკი (%)',         step: '0.01' },
            { key: 'customs', label: 'საბაჟო (%)',        step: '0.01' },
            { key: 'other',   label: 'სხვა (%)',          step: '0.01' },
            { key: 'otherFix', label: 'ფიქსირებული (₾/ცალი)', step: '0.01' },
            { key: 'shipFix', label: 'ერთიანი გადაზ. (₾)', step: '1' },
            { key: 'shipQty', label: 'ცალები პარტიაში',   step: '1' },
          ].map(f => (
            <label key={f.key} style={{ fontSize: 13 }}>
              {f.label}
              <input type="number" step={f.step} className="input" style={{ display: 'block', marginTop: 4, width: '100%' }}
                value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
            </label>
          ))}
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={!!form.vat} onChange={e => set('vat', e.target.checked)} style={{ marginRight: 4 }} />
            დღგ 18%
          </label>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>ფასი და შეთავაზება</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ fontSize: 13 }}>სტანდარტული ნამატი (%):
            <input type="number" step="0.1" className="input" style={{ display: 'block', marginTop: 4 }}
              value={form.markup ?? ''} onChange={e => set('markup', e.target.value)} />
          </label>
          <label style={{ fontSize: 13 }}>დამრგვალება (₾, 0=გამორთ.):
            <input type="number" step="0.05" className="input" style={{ display: 'block', marginTop: 4 }}
              value={form.round ?? ''} onChange={e => set('round', e.target.value)} />
          </label>
          <label style={{ fontSize: 13 }}>მოქმედების ვადა (დღე):
            <input type="number" step="1" className="input" style={{ display: 'block', marginTop: 4 }}
              value={form.validity ?? ''} onChange={e => set('validity', e.target.value)} />
          </label>
        </div>
      </div>

      {/* example calculation strip */}
      <div className="card" style={{ marginBottom: 16, background: 'var(--bg-muted)' }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>დათვლის მაგალითი (B1-10 როზეტი დამიწ.)</div>
        {exLc.parts ? (
          <div style={{ fontSize: 13, lineHeight: 1.8, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {[
              ['ქარხ. ფასი', (form.currency === 'CNY' ? '¥' : '$') + exLc.parts.price?.toFixed(2)],
              ['საქ.+ბანკი+გადაზ.', gel(exLc.parts.goods + exLc.parts.bank + exLc.parts.freight)],
              ['საბაჟო + სხვა', gel(exLc.parts.customs + exLc.parts.other)],
              ['ფიქსირებული', gel(exLc.parts.fixed)],
              ['დღგ', gel(exLc.parts.vat)],
              ['თვითღირ. სულ', gel(exLc.cost)],
              ['ფასი კლიენტს', gel(exLc.sale)],
              ['მოგება', gel(exLc.profitPerUnit)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: 8 }}>B1-10-ის ფასი არ არის შეყვანილი</div>
        )}
      </div>

      <button className="btn btn-primary" onClick={save}>💾 შენახვა</button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Print helper
══════════════════════════════════════════════════════════ */
function printQuote(q, prices, settings) {
  const validity = settings?.validity || DEFAULT_SWITCH_SETTINGS.validity;
  const validDate = new Date(q.updated || q.created);
  validDate.setDate(validDate.getDate() + validity);

  const rows = q.lines.map((l, i) => {
    const it = ITEMS_BY_ID[l.id];
    const lc = lineCalc(prices, settings, l);
    const colorHex = ALL_SERIES.flatMap(s => s.colors).find(c => c.id === l.color)?.hex || '#ccc';
    const shade = (h, amt) => {
      const n = parseInt(h.replace('#', ''), 16);
      let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
      const L = (r * 299 + g * 587 + b * 114) / 1000;
      const k = L > 140 ? -amt : amt;
      return `rgb(${Math.max(0, Math.min(255, r + k))},${Math.max(0, Math.min(255, g + k))},${Math.max(0, Math.min(255, b + k))})`;
    };
    // inline SVG icon as data string
    const f = colorHex, s2 = shade(colorHex, 60);
    const iconSvg = `<svg viewBox="0 0 40 40" width="24" height="24"><rect x="4" y="4" width="32" height="32" rx="2.5" fill="${f}" stroke="${s2}" stroke-width="1"/></svg>`;
    const saleV = lc.sale != null ? lc.sale : 0;
    return `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="text-align:center">${iconSvg}</td>
      <td>${it?.ka || l.id} <small style="color:#888">${it?.code || ''}</small></td>
      <td style="text-align:center">${l.qty}</td>
      <td style="text-align:right">${saleV.toFixed(2)} ₾</td>
      <td style="text-align:right">${(saleV * l.qty).toFixed(2)} ₾</td>
    </tr>`;
  }).join('');

  const total = q.lines.reduce((s, l) => {
    const lc = lineCalc(prices, settings, l);
    return s + (lc.sale != null ? lc.sale * l.qty : 0);
  }, 0);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${q.no}</title>
<style>
  body{font-family:DejaVu Sans,Arial,sans-serif;margin:0;padding:32px;font-size:13px;color:#1a1a1a}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
  .company{font-size:18px;font-weight:700;color:#111}
  .co-sub{font-size:12px;color:#666;margin-top:4px}
  .meta{text-align:right;font-size:12px;color:#444}
  .meta b{font-size:15px;color:#111;display:block;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th{background:#f5f5f5;padding:8px 10px;text-align:left;border-bottom:2px solid #ddd;font-size:12px}
  td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:middle}
  .total-row{font-weight:700;font-size:14px;background:#f9f9f9}
  .note{margin-top:16px;font-size:12px;color:#555;border-top:1px solid #eee;padding-top:12px}
  @media print{body{padding:16px}}
</style></head><body>
<div class="header">
  <div>
    <div class="company">SmartPro</div>
    <div class="co-sub">office.smartpro.ge</div>
    <div class="co-sub">+995 XXX XXX XXX</div>
  </div>
  <div class="meta">
    <b>${q.no}</b>
    <div>თარიღი: ${new Date(q.updated || q.created).toLocaleDateString('ka-GE')}</div>
    <div>მოქმ. ვადა: ${validDate.toLocaleDateString('ka-GE')}-მდე</div>
    ${q.client?.name ? '<div style="margin-top:6px;font-weight:600">' + q.client.name + '</div>' : ''}
    ${q.client?.project ? '<div>' + q.client.project + '</div>' : ''}
  </div>
</div>
<table>
  <thead><tr><th>№</th><th></th><th>დასახელება</th><th style="text-align:center">რაოდენობა</th><th style="text-align:right">ფასი</th><th style="text-align:right">ჯამი</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="5" style="text-align:right">სულ გადასახდელი:</td>
      <td style="text-align:right">${total.toFixed(2)} ₾</td>
    </tr>
  </tfoot>
</table>
${q.client?.note ? '<div class="note">შენიშვნა: ' + q.client.note + '</div>' : ''}
<div class="note" style="margin-top:24px;text-align:center;color:#aaa;font-size:11px">
  SmartPro — ქართული ლოკალური ბრენდი
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}
