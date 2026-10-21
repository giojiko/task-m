'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';

// ── helpers ──────────────────────────────────────────────────────────────────
const usd = n => (n < 0 ? '−$' : '$') + Math.round(Math.abs(n)).toLocaleString('en-US');
const pct = n => (isFinite(n) ? (n * 100).toFixed(1) : '0.0') + '%';
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => {
  if (!a) return 0;
  const d = (new Date(b ?? todayStr()) - new Date(a)) / 864e5;
  return isFinite(d) ? Math.max(0, Math.round(d)) : 0;
};

const STATUSES = [['bought','ნაყიდი'],['reno','რემონტში'],['ready','მზადაა გასაყიდად'],['sold','გაყიდული']];
const TAXES = [['0','გადასახადის გარეშე'],['5','5% — ფიზიკური პირი'],['15','15% — კომპანია'],['20','20% — სისტემატური გადაყიდვა']];
const STATUS_NAME = Object.fromEntries(STATUSES);

function calcFlip(flip, expenses) {
  let mat = 0, lab = 0;
  const byCat = {};
  for (const e of (expenses ?? [])) {
    const a = Number(e.amount) || 0;
    if (e.kind === 'lab') lab += a; else mat += a;
    const c = byCat[e.category] ?? (byCat[e.category] = { m: 0, l: 0 });
    if (e.kind === 'lab') c.l += a; else c.m += a;
  }
  const reno = mat + lab;
  const buy = Number(flip.buy_price) || 0;
  const extra = Number(flip.buy_extra) || 0;
  const sqm = Number(flip.sqm) || 0;
  const cost = buy + extra + reno;
  const sold = flip.status === 'sold' && Number(flip.sale_price) > 0;
  const price = sold ? Number(flip.sale_price) : Number(flip.ask_price);
  const broker = flip.broker_mode === 'amt'
    ? Number(flip.broker_amt) || 0
    : price * (Number(flip.broker_pct) || 0) / 100;
  const other = Number(flip.other_sale_cost) || 0;
  const taxRate = Number(flip.tax_pct) / 100;
  const taxBase = taxRate === 0.15 ? price - cost - broker - other : price - buy - reno;
  const tax = price > 0 ? Math.max(0, taxBase) * taxRate : 0;
  const profit = price > 0 ? price - cost - broker - other - tax : 0;
  const held = daysBetween(flip.buy_date, sold ? flip.sale_date : null);
  const roi = cost ? profit / cost : 0;
  return {
    mat, lab, reno, byCat, cost, price, sold, broker, other, taxBase, tax, profit, held, roi,
    annual: held ? roi * 365 / held : 0, sqm,
    buySqm: sqm ? buy / sqm : 0,
    renoSqm: sqm ? reno / sqm : 0,
    priceSqm: sqm && price ? price / sqm : 0,
    renoDays: daysBetween(flip.buy_date, flip.ready_date),
    sellDays: flip.ready_date ? daysBetween(flip.ready_date, sold ? flip.sale_date : null) : 0,
  };
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(flip, expenses) {
  const rows = [['თარიღი','კატეგორია','ტიპი','შენიშვნა','თანხა']];
  for (const e of (expenses ?? [])) {
    rows.push([e.date, e.category, e.kind === 'lab' ? 'ხელობა' : 'მასალა', e.note, e.amount]);
  }
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
  a.download = `flips-${flip.id}.csv`;
  a.click();
}

// ── main component ────────────────────────────────────────────────────────────
export default function FlipsPage() {
  const { t } = useApp();
  const [flips, setFlips] = useState([]);
  const [expenses, setExpenses] = useState({}); // flipId → []
  const [categories, setCategories] = useState([]);
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myAccess, setMyAccess] = useState(null);
  // expense form state
  const [eCat, setECat] = useState('');
  const [eKind, setEKind] = useState('mat');
  const [eAmt, setEAmt] = useState('');
  const [eNote, setENote] = useState('');
  const [eDate, setEDate] = useState(todayStr());
  // delete confirm
  const [delConfirm, setDelConfirm] = useState(false);

  useEffect(() => {
    fetch('/api/flips/me').then(r => r.json()).then(d => setMyAccess(d.level));
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [fRes, cRes] = await Promise.all([
      fetch('/api/flips').then(r => r.json()),
      fetch('/api/flips/categories').then(r => r.json()),
    ]);
    const flipsArr = Array.isArray(fRes) ? fRes : [];
    setFlips(flipsArr);
    setCategories(Array.isArray(cRes) ? cRes : []);
    if (flipsArr.length) setECat(cRes[0]?.name ?? '');
    setLoading(false);
  }

  const loadExpenses = useCallback(async (flipId) => {
    if (expenses[flipId]) return;
    const data = await fetch(`/api/flips/${flipId}/expenses`).then(r => r.json());
    setExpenses(prev => ({ ...prev, [flipId]: Array.isArray(data) ? data : [] }));
  }, [expenses]);

  useEffect(() => {
    if (sel) loadExpenses(sel);
  }, [sel]);

  useEffect(() => {
    if (categories.length && !eCat) setECat(categories[0]?.name ?? '');
  }, [categories]);

  const canEdit = myAccess === 'owner' || myAccess === 'edit';

  // ── selected flip ──────────────────────────────────────────────────────────
  const flip = flips.find(f => f.id === sel);
  const flipExpenses = expenses[sel] ?? [];
  const calc = flip ? calcFlip(flip, flipExpenses) : null;

  // ── filtered list ──────────────────────────────────────────────────────────
  const list = useMemo(() => {
    const sorted = [...flips].sort((a,b) => (b.buy_date ?? '').localeCompare(a.buy_date ?? ''));
    return filter === 'all' ? sorted : sorted.filter(f => f.status === filter);
  }, [flips, filter]);

  // ── summary ────────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const all = flips.map(f => ({ f, c: calcFlip(f, expenses[f.id] ?? []) }));
    const active = all.filter(x => x.f.status !== 'sold');
    const sold = all.filter(x => x.c.sold);
    return {
      total: all.length,
      inWork: active.reduce((s, x) => s + x.c.cost, 0),
      realProfit: sold.reduce((s, x) => s + x.c.profit, 0),
      avgProfit: sold.length ? sold.reduce((s, x) => s + x.c.profit, 0) / sold.length : 0,
      avgDays: sold.length ? Math.round(sold.reduce((s, x) => s + x.c.held, 0) / sold.length) : 0,
      projProfit: active.filter(x => x.c.price > 0).reduce((s, x) => s + x.c.profit, 0),
      counts: Object.fromEntries(STATUSES.map(([k]) => [k, all.filter(x => x.f.status === k).length])),
      soldCount: sold.length,
    };
  }, [flips, expenses]);

  // ── mutations ──────────────────────────────────────────────────────────────
  async function newFlip() {
    setSaving(true);
    const res = await fetch('/api/flips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '', address: '', district: '', sqm: 0,
        buy_price: 0, buy_date: todayStr(), buy_extra: 0,
        status: 'bought', ask_price: 0, sale_price: 0,
        broker_mode: 'pct', broker_pct: 2, tax_pct: 20,
      }),
    }).then(r => r.json());
    setSaving(false);
    if (res.id) { setFlips(prev => [res, ...prev]); setSel(res.id); setFilter('all'); }
  }

  async function patchFlip(id, patch) {
    const current = flips.find(f => f.id === id);
    const updated = { ...current, ...patch };
    setFlips(prev => prev.map(f => f.id === id ? updated : f));
    await fetch(`/api/flips/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, _expectedVersion: current?.version }),
    });
    // refresh to get new version
    const fresh = await fetch(`/api/flips/${id}`).then(r => r.json());
    if (fresh.id) setFlips(prev => prev.map(f => f.id === id ? fresh : f));
  }

  async function changeStatus(newStatus) {
    if (!flip) return;
    const patch = { status: newStatus };
    if (newStatus === 'ready' && !flip.ready_date) patch.ready_date = todayStr();
    if (newStatus === 'sold') {
      if (!flip.sale_date) patch.sale_date = todayStr();
      if (!Number(flip.sale_price) && Number(flip.ask_price)) patch.sale_price = flip.ask_price;
      if (!flip.ready_date) patch.ready_date = patch.sale_date || todayStr();
    }
    await patchFlip(flip.id, patch);
  }

  async function addExpense(e) {
    e.preventDefault();
    const amt = Number(eAmt);
    if (!amt || !sel) return;
    const res = await fetch(`/api/flips/${sel}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: eCat, kind: eKind, amount: amt, note: eNote, date: eDate }),
    }).then(r => r.json());
    if (res.id) {
      setExpenses(prev => ({ ...prev, [sel]: [res, ...(prev[sel] ?? [])] }));
      // auto status
      if (flip?.status === 'bought') {
        setFlips(prev => prev.map(f => f.id === sel ? { ...f, status: 'reno' } : f));
      }
      setEAmt(''); setENote('');
    }
  }

  async function deleteExpense(expId) {
    await fetch(`/api/flips/${sel}/expenses?expId=${expId}`, { method: 'DELETE' });
    setExpenses(prev => ({ ...prev, [sel]: (prev[sel] ?? []).filter(e => e.id !== expId) }));
  }

  async function deleteFlip() {
    if (!delConfirm) { setDelConfirm(true); setTimeout(() => setDelConfirm(false), 4000); return; }
    await fetch(`/api/flips/${sel}`, { method: 'DELETE' });
    setFlips(prev => prev.filter(f => f.id !== sel));
    setSel(null); setDelConfirm(false);
  }

  // ── status helpers ─────────────────────────────────────────────────────────
  const statusHint = flip ? (
    flip.status === 'bought' ? `ნაყიდია ${calc.held} დღეა.` :
    flip.status === 'reno'   ? `რემონტი მიდის. ყიდვიდან გავიდა ${calc.held} დღე.` :
    flip.status === 'ready'  ? `გასაყიდად მზადაა${flip.ready_date ? ` ${calc.sellDays} დღეა` : ''}. ყიდვიდან ${calc.held} დღე.` :
    `გაიყიდა ${calc.held} დღეში${flip.ready_date ? `: რემონტს დასჭირდა ${calc.renoDays} დღე, გაყიდვას ${calc.sellDays} დღე` : ''}.`
  ) : '';

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading) return <AppShell><div className="empty">იტვირთება...</div></AppShell>;

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px,3.5vw,28px)', fontWeight: 800 }}>ბინების აღრიცხვის ბაზა</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>ყიდვა, რემონტი კატეგორიებით, სტატუსი, გაყიდვის შედეგი</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {canEdit && (
              <button className="btn btn-primary" onClick={newFlip} disabled={saving}>
                {saving ? 'ვქმნი...' : '+ ახალი ბინა'}
              </button>
            )}
            <a href="/flips/calculator" className="btn">კალკულატორი</a>
          </div>
        </div>

        {/* summary bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {[
            { label: 'ბინა ბაზაში', val: summary.total, sub: `${summary.counts.reno ?? 0} რემონტში, ${summary.counts.ready ?? 0} მზადაა` },
            { label: 'ფული საქმეში', val: usd(summary.inWork), sub: `${flips.filter(f=>f.status!=='sold').length} გაუყიდავ ბინაში` },
            { label: 'მიღებული მოგება', val: usd(summary.realProfit), sub: `${summary.soldCount} გაყიდულ ბინაზე`, color: summary.realProfit >= 0 ? 'var(--success)' : 'var(--danger)' },
            { label: 'საშუალოდ ერთ ბინაზე', val: usd(summary.avgProfit), sub: summary.soldCount ? `${summary.avgDays} დღეში` : 'ჯერ გაყიდული არ არის', color: summary.avgProfit >= 0 ? 'var(--success)' : 'var(--danger)' },
            { label: 'მოსალოდნელი მოგება', val: usd(summary.projProfit), sub: 'გასაყიდი ფასის მიხედვით', color: summary.projProfit >= 0 ? 'var(--success)' : 'var(--danger)' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
              <div style={{ fontFamily: 'var(--font-mono,monospace)', fontWeight: 700, fontSize: 'clamp(15px,2vw,20px)', color: k.color }}>{k.val}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,300px) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>

          {/* list */}
          <aside>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {[['all','ყველა', flips.length], ...STATUSES.map(([k,n]) => [k, n, summary.counts[k] ?? 0])].map(([k,n,c]) => (
                <button key={k} className={`btn btn-xs${filter === k ? ' btn-primary' : ''}`} style={{ borderRadius: 999, fontSize: 13 }} onClick={() => setFilter(k)}>
                  {n} {c}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.length === 0 && (
                <div className="empty">{flips.length ? 'ამ სტატუსით ბინა არ არის.' : 'ჯერ ბინა არ გაქვს. დაამატე პირველი.'}</div>
              )}
              {list.map(f => {
                const c = calcFlip(f, expenses[f.id] ?? []);
                return (
                  <button key={f.id} onClick={() => setSel(f.id)}
                    style={{ textAlign: 'left', padding: '12px 14px', border: `1px solid ${f.id === sel ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg-card)', borderRadius: 10, cursor: 'pointer', boxShadow: f.id === sel ? '0 0 0 1px var(--accent)' : undefined }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{f.title || f.address || 'უსახელო ბინა'}</span>
                      <span style={{ fontSize: 12, padding: '2px 9px', borderRadius: 999, background: { bought: 'var(--info-soft,#dde7f1)', reno: '#f6e7d2', ready: 'var(--success-soft,#dcebe4)', sold: 'var(--border)' }[f.status], color: { bought: 'var(--info,#2f5e8c)', reno: '#c27a1e', ready: 'var(--success,#1e6b57)', sold: 'var(--text-primary)' }[f.status], whiteSpace: 'nowrap' }}>
                        {STATUS_NAME[f.status]}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      <span>{Number(f.sqm)||'?'} კვადრატული მეტრი{f.district ? `, ${f.district}` : ''}</span>
                      <span>{c.held} დღე</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 2 }}>
                      <span>ხარჯი <b>{usd(c.cost)}</b></span>
                      {c.price > 0 && <span style={{ color: c.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{c.sold ? 'მოგება' : 'სავარაუდოდ'} <b>{usd(c.profit)}</b></span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* detail */}
          <main>
            {!flip ? (
              <div className="empty">აირჩიე ბინა სიიდან ან დაამატე ახალი.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* purchase */}
                <div className="card">
                  <h2 className="card-title">ყიდვა</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                    {[
                      ['title','სახელი (მაგ. ვაკე, ჭავჭავაძე 12)','text',true],
                      ['address','მისამართი','text'],
                      ['district','უბანი','text'],
                      ['sqm','ფართი, კვადრატული მეტრი','number'],
                      ['buy_price','ყიდვის ფასი, დოლარი','number'],
                      ['buy_date','ყიდვის თარიღი','date'],
                      ['buy_extra','ყიდვის ხარჯი (რეესტრი, ნოტარიუსი)','number'],
                    ].map(([key, label, type, wide]) => (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: wide ? '1/-1' : undefined }}>
                        <label className="form-label">{label}</label>
                        <input className="input" type={type} value={flip[key] ?? ''} disabled={!canEdit}
                          onBlur={e => canEdit && patchFlip(flip.id, { [key]: type === 'number' ? Number(e.target.value) || 0 : e.target.value })}
                          onChange={e => setFlips(prev => prev.map(f => f.id === flip.id ? { ...f, [key]: e.target.value } : f))} />
                      </div>
                    ))}
                  </div>
                  {calc.sqm > 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>ყიდვის ფასი კვადრატულ მეტრზე: {usd(calc.buySqm)}.</p>}
                </div>

                {/* status */}
                <div className="card">
                  <h2 className="card-title">სტატუსი</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 6 }}>
                    {STATUSES.map(([k, n]) => (
                      <button key={k} disabled={!canEdit} onClick={() => changeStatus(k)}
                        style={{ padding: '10px 8px', borderRadius: 8, border: `1px solid ${flip.status === k ? 'currentColor' : 'var(--border)'}`, fontSize: 13.5, textAlign: 'center', cursor: canEdit ? 'pointer' : 'default',
                          fontWeight: flip.status === k ? 700 : 400,
                          background: flip.status === k ? { bought:'var(--info-soft,#dde7f1)', reno:'#f6e7d2', ready:'var(--success-soft,#dcebe4)', sold:'var(--border)' }[k] : 'var(--bg)',
                          color: flip.status === k ? { bought:'var(--info,#2f5e8c)', reno:'#c27a1e', ready:'var(--success,#1e6b57)', sold:'var(--text-primary)' }[k] : 'var(--text-muted)' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label">გასაყიდად მზადაა, თარიღი</label>
                    <input className="input" type="date" value={flip.ready_date ?? ''} disabled={!canEdit}
                      onBlur={e => canEdit && patchFlip(flip.id, { ready_date: e.target.value || null })}
                      onChange={e => setFlips(prev => prev.map(f => f.id === flip.id ? { ...f, ready_date: e.target.value } : f))} style={{ maxWidth: 200 }} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{statusHint}</p>
                </div>

                {/* expenses */}
                {canEdit && (
                  <div className="card">
                    <h2 className="card-title">რემონტის ხარჯები {flipExpenses.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{flipExpenses.length} ჩანაწერი</span>}</h2>
                    <form onSubmit={addExpense} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,1.4fr) minmax(0,1fr) auto', gap: 8, alignItems: 'end' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label className="form-label">კატეგორია</label>
                        <select className="select" value={eCat} onChange={e => setECat(e.target.value)}>
                          {categories.map(c => <option key={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label className="form-label">ტიპი</label>
                        <select className="select" value={eKind} onChange={e => setEKind(e.target.value)}>
                          <option value="mat">მასალა</option>
                          <option value="lab">ხელობა</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label className="form-label">თანხა, დოლარი</label>
                        <input className="input" type="number" step="any" min="0" placeholder="0" required value={eAmt} onChange={e => setEAmt(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label className="form-label">შენიშვნა</label>
                        <input className="input" type="text" placeholder="კაბელი, ავტომატები" value={eNote} onChange={e => setENote(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label className="form-label">თარიღი</label>
                        <input className="input" type="date" value={eDate} onChange={e => setEDate(e.target.value)} />
                      </div>
                      <button className="btn btn-primary" type="submit" style={{ gridColumn: 'span 1' }}>დამატება</button>
                    </form>

                    <div style={{ overflowX: 'auto', marginTop: 12 }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13.5, minWidth: 500 }}>
                        <thead><tr>
                          {['თარიღი','კატეგორია','ტიპი','შენიშვნა','თანხა',''].map((h,i) => (
                            <th key={i} style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textAlign: i >= 4 ? 'right' : 'left' }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {flipExpenses.length === 0 && (
                            <tr><td colSpan={6} style={{ padding: 12, color: 'var(--text-muted)' }}>ხარჯი ჯერ არ არის.</td></tr>
                          )}
                          {[...flipExpenses].sort((a,b) => (b.date||'').localeCompare(a.date||'')).map(e => (
                            <tr key={e.id}>
                              <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)' }}>{e.date}</td>
                              <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)' }}>{e.category}</td>
                              <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: e.kind === 'lab' ? '#f6e7d2' : 'var(--success-soft,#dcebe4)', color: e.kind === 'lab' ? '#c27a1e' : 'var(--success)' }}>
                                  {e.kind === 'lab' ? 'ხელობა' : 'მასალა'}
                                </span>
                              </td>
                              <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)' }}>{e.note}</td>
                              <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>{usd(e.amount)}</td>
                              <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)' }}>
                                <button onClick={() => deleteExpense(e.id)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: '2px 8px', borderRadius: 6 }}>×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* category breakdown */}
                {flipExpenses.length > 0 && (
                  <div className="card">
                    <h2 className="card-title">სად წავიდა რემონტის ფული</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                      {[['მასალა', usd(calc.mat)], ['ხელობა', usd(calc.lab)], [`სულ რემონტი${calc.sqm ? `, კვ.მ. ${usd(calc.renoSqm)}` : ''}`, usd(calc.reno)]].map(([l, v]) => (
                        <div key={l} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l}</div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--accent)', marginRight: 5 }} />მასალა</span>
                      <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#c27a1e', marginRight: 5 }} />ხელობა</span>
                    </div>
                    {Object.entries(calc.byCat)
                      .map(([k, v]) => [k, v.m, v.l, v.m + v.l])
                      .filter(x => x[3] > 0)
                      .sort((a, b) => b[3] - a[3])
                      .map(([k, m, l, t]) => {
                        const mx = Math.max(...Object.values(calc.byCat).map(v => v.m + v.l));
                        return (
                          <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,170px) minmax(0,1fr) 90px', gap: 10, alignItems: 'center', marginBottom: 9, fontSize: 13 }}>
                            <span style={{ overflowWrap: 'anywhere' }}>{k}</span>
                            <div style={{ height: 12, borderRadius: 3, background: 'var(--bg)', display: 'flex', overflow: 'hidden' }}>
                              <div style={{ background: 'var(--accent)', width: `${m / mx * 100}%` }} />
                              <div style={{ background: '#c27a1e', width: `${l / mx * 100}%` }} />
                            </div>
                            <span style={{ fontFamily: 'monospace', textAlign: 'right' }}>{usd(t)}</span>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* sale */}
                <div className="card">
                  <h2 className="card-title">გაყიდვა</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                    {[
                      ['ask_price','გასაყიდი ფასი (განცხადებაში), დოლარი','number'],
                      ['sale_price','რეალურად გაიყიდა, დოლარი','number'],
                      ['sale_date','გაყიდვის თარიღი','date'],
                    ].map(([key, label, type]) => (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label className="form-label">{label}</label>
                        <input className="input" type={type} value={flip[key] ?? ''} disabled={!canEdit}
                          onBlur={e => canEdit && patchFlip(flip.id, { [key]: type === 'number' ? Number(e.target.value) || 0 : e.target.value || null })}
                          onChange={e => setFlips(prev => prev.map(f => f.id === flip.id ? { ...f, [key]: e.target.value } : f))} />
                      </div>
                    ))}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label className="form-label">მაკლერის ანაზღაურება</label>
                      <select className="select" value={flip.broker_mode ?? 'pct'} disabled={!canEdit}
                        onChange={e => canEdit && patchFlip(flip.id, { broker_mode: e.target.value })}>
                        <option value="pct">პროცენტი ფასიდან</option>
                        <option value="amt">ფიქსირებული თანხა</option>
                      </select>
                    </div>
                    {flip.broker_mode !== 'amt' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label className="form-label">მაკლერი, პროცენტი</label>
                        <input className="input" type="number" value={flip.broker_pct ?? 2} disabled={!canEdit}
                          onBlur={e => canEdit && patchFlip(flip.id, { broker_pct: Number(e.target.value) || 0 })}
                          onChange={e => setFlips(prev => prev.map(f => f.id === flip.id ? { ...f, broker_pct: e.target.value } : f))} />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label className="form-label">მაკლერი, დოლარი</label>
                        <input className="input" type="number" value={flip.broker_amt ?? 0} disabled={!canEdit}
                          onBlur={e => canEdit && patchFlip(flip.id, { broker_amt: Number(e.target.value) || 0 })}
                          onChange={e => setFlips(prev => prev.map(f => f.id === flip.id ? { ...f, broker_amt: e.target.value } : f))} />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label className="form-label">სხვა ხარჯი გაყიდვისას, დოლარი</label>
                      <input className="input" type="number" value={flip.other_sale_cost ?? 0} disabled={!canEdit}
                        onBlur={e => canEdit && patchFlip(flip.id, { other_sale_cost: Number(e.target.value) || 0 })}
                        onChange={e => setFlips(prev => prev.map(f => f.id === flip.id ? { ...f, other_sale_cost: e.target.value } : f))} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label className="form-label">გადასახადი</label>
                      <select className="select" value={String(flip.tax_pct ?? 20)} disabled={!canEdit}
                        onChange={e => canEdit && patchFlip(flip.id, { tax_pct: Number(e.target.value) })}>
                        {TAXES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1/-1' }}>
                      <label className="form-label">შენიშვნები</label>
                      <textarea className="input" rows={3} value={flip.notes ?? ''} disabled={!canEdit}
                        onBlur={e => canEdit && patchFlip(flip.id, { notes: e.target.value })}
                        onChange={e => setFlips(prev => prev.map(f => f.id === flip.id ? { ...f, notes: e.target.value } : f))} />
                    </div>
                  </div>
                </div>

                {/* result */}
                <div className="card" style={{ borderLeft: `4px solid ${calc.price > 0 ? (calc.profit >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--border)'}` }}>
                  <h2 className="card-title">{calc.sold ? 'შედეგი' : 'სავარაუდო შედეგი'}</h2>
                  {calc.price > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '6px 16px', fontSize: 14 }}>
                      {[
                        [calc.sold ? 'გაყიდვის ფასი' : 'გასაყიდი ფასი (სავარაუდო)', usd(calc.price)],
                        ['ყიდვა', usd(-Number(flip.buy_price) || 0)],
                        ['ყიდვის ხარჯი', usd(-Number(flip.buy_extra) || 0)],
                        ['რემონტი', usd(-calc.reno)],
                        [`მაკლერი${flip.broker_mode !== 'amt' ? ` ${flip.broker_pct}%` : ''}`, usd(-calc.broker)],
                        ...(calc.other ? [['სხვა ხარჯი', usd(-calc.other)]] : []),
                        [Number(flip.tax_pct) ? `გადასახადი ${flip.tax_pct}% (ბაზა ${usd(Math.max(0, calc.taxBase))})` : 'გადასახადი', usd(-calc.tax)],
                      ].map(([l, v], i) => (
                        <>
                          <div key={`l${i}`}>{l}</div>
                          <div key={`v${i}`} style={{ fontFamily: 'monospace', textAlign: 'right' }}>{v}</div>
                        </>
                      ))}
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 7, fontWeight: 700 }}>{calc.sold ? 'წმინდა მოგება' : 'წმინდა მოგება (სავარაუდო)'}</div>
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 7, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, fontSize: 18, color: calc.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{usd(calc.profit)}</div>
                      <div style={{ color: 'var(--text-muted)' }}>უკუგება ჩადებულ თანხაზე</div>
                      <div style={{ fontFamily: 'monospace', textAlign: 'right' }}>{pct(calc.roi)}</div>
                      <div style={{ color: 'var(--text-muted)' }}>ვადა</div>
                      <div style={{ fontFamily: 'monospace', textAlign: 'right' }}>{calc.held} დღე</div>
                      {calc.held > 0 && <>
                        <div style={{ color: 'var(--text-muted)' }}>წლიურად გადაყვანით</div>
                        <div style={{ fontFamily: 'monospace', textAlign: 'right' }}>{pct(calc.annual)}</div>
                      </>}
                      {calc.sqm > 0 && <>
                        <div style={{ color: 'var(--text-muted)' }}>ფასი კვადრატულ მეტრზე: ყიდვა და გაყიდვა</div>
                        <div style={{ fontFamily: 'monospace', textAlign: 'right' }}>{usd(calc.buySqm)} → {usd(calc.priceSqm)}</div>
                      </>}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>ჩაწერე გასაყიდი ფასი, რომ სავარაუდო მოგება დაითვალოს. სულ ჩადებულია: <b>{usd(calc.cost)}</b>.</div>
                  )}
                </div>

                {/* actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="btn" onClick={() => exportCsv(flip, flipExpenses)}>CSV ექსპორტი</button>
                  {canEdit && (
                    <button className={`btn${delConfirm ? ' btn-danger' : ''}`} onClick={deleteFlip}
                      style={{ borderColor: 'var(--danger)', color: delConfirm ? '#fff' : 'var(--danger)', background: delConfirm ? 'var(--danger)' : undefined }}>
                      {delConfirm ? 'დაადასტურე წაშლა' : 'ბინის წაშლა'}
                    </button>
                  )}
                </div>

              </div>
            )}
          </main>
        </div>
      </div>
    </AppShell>
  );
}
