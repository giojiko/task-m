'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';

// ── pure calc (mirrors lib/flips/calc.ts, no import to keep client-only) ────
function unit(p) {
  const gross = p.sqm * p.askPrice;
  const buy = p.sqm * p.buyPsm;
  const reno = p.sqm * p.renoPsm;
  const extra = p.sqm * p.buyPsm * p.buyExtraPct / 100;
  const cost = buy + extra + reno;
  const broker = gross * p.brokerPct / 100;
  const taxRate = p.taxPct / 100;
  const taxBase = taxRate === 0.15 ? gross - cost - broker : gross - buy - reno;
  const tax = Math.max(0, taxBase) * taxRate;
  const profit = gross - cost - broker - tax;
  const roi = cost ? profit / cost : 0;
  return { gross, buy, reno, extra, cost, broker, tax, taxBase, profit, roi };
}

function cycle(p, ownCap, isFirst, invCap) {
  const u = unit(p);
  const totalNeeded = u.cost;
  const actualInv = Math.min(invCap, Math.max(0, totalNeeded - ownCap));
  const actualOwn = totalNeeded - actualInv;
  const profit = u.profit;
  const invProfit = actualInv > 0 ? profit * (actualInv / totalNeeded) : 0;
  const ownProfit = profit - invProfit;
  const invReturn = actualInv + invProfit;
  const invAnnual = p.cycleDays > 0 ? (invProfit / actualInv) * 365 / p.cycleDays : 0;
  return { totalNeeded, actualInv, actualOwn, profit, ownProfit, invProfit, invReturn, invAnnual, u };
}

function simulate(p) {
  const horizonDays = p.horizonMonths * 30;
  let day = 0;
  let ownCash = p.ownCap;
  const invCap = p.invCap;
  const cycles = [];
  let cycleNum = 0;

  while (day + p.cycleDays <= horizonDays && cycleNum < 50) {
    const c = cycle(p, ownCash, cycleNum === 0, invCap);
    if (c.totalNeeded > ownCash + invCap) break;
    const invRepay = c.invReturn;
    ownCash = ownCash - c.actualOwn + c.ownProfit;
    const endDay = day + p.cycleDays;
    cycles.push({ num: cycleNum + 1, startDay: day, endDay, ...c, ownCashAfter: ownCash, invRepay, investorCash: invCap });
    day = endDay;
    cycleNum++;
  }
  const totalOwnProfit = cycles.reduce((s, c) => s + c.ownProfit, 0);
  const totalCycles = cycles.length;
  const totalProfit = cycles.reduce((s, c) => s + c.profit, 0);
  return { cycles, totalOwnProfit, totalCycles, totalProfit, finalOwnCash: ownCash };
}

function breakEvenSearch(p) {
  let lo = p.buyPsm + p.renoPsm;
  let hi = lo * 3;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (unit({ ...p, askPrice: mid }).profit >= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

// ── format helpers ────────────────────────────────────────────────────────────
const usd = n => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const pct = n => (n * 100).toFixed(1) + '%';
const num = n => Number(n).toLocaleString('en-US');

// ── default params ────────────────────────────────────────────────────────────
const DEFAULT = {
  sqm: 60, buyPsm: 1200, buyExtraPct: 1, renoPsm: 250,
  askPrice: 1800, brokerPct: 2, taxPct: 20,
  ownCap: 120000, invCap: 0, horizonMonths: 12, cycleDays: 90,
  invMode: 'none',
};

const TABS = [['unit','ერთი ბინა'],['sim','სიმულაცია'],['sens','სენსიტიურობა']];

export default function CalculatorPage() {
  const { t } = useApp();
  const [p, setP] = useState(DEFAULT);
  const [tab, setTab] = useState('unit');
  const [scenarios, setScenarios] = useState([]);
  const [scenName, setScenName] = useState('');
  const [loadingSc, setLoadingSc] = useState(false);
  const [myAccess, setMyAccess] = useState(null);

  useEffect(() => {
    fetch('/api/flips/me').then(r => r.json()).then(d => setMyAccess(d.level));
    fetch('/api/flips/scenarios').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setScenarios(d);
    });
  }, []);

  const canEdit = myAccess === 'owner' || myAccess === 'edit';

  const set = (key, val) => setP(prev => ({ ...prev, [key]: val }));
  const num_ = v => Number(v) || 0;

  const u = useMemo(() => unit(p), [p]);
  const sim = useMemo(() => simulate(p), [p]);
  const be = useMemo(() => breakEvenSearch(p), [p]);

  async function saveScenario() {
    if (!scenName.trim()) return;
    setLoadingSc(true);
    const res = await fetch('/api/flips/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: scenName, params: p }),
    }).then(r => r.json());
    if (res.id) setScenarios(prev => [res, ...prev]);
    setScenName(''); setLoadingSc(false);
  }

  async function deleteScenario(id) {
    await fetch(`/api/flips/scenarios?id=${id}`, { method: 'DELETE' });
    setScenarios(prev => prev.filter(s => s.id !== id));
  }

  function loadScenario(sc) {
    if (sc.params && typeof sc.params === 'object') setP({ ...DEFAULT, ...sc.params });
  }

  // sensitivity: vary askPrice ±20%, show profit
  const sensRows = useMemo(() => {
    const steps = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
    return steps.map(delta => {
      const askPrice = p.askPrice * (1 + delta / 100);
      const u2 = unit({ ...p, askPrice });
      return { delta, askPrice, profit: u2.profit, roi: u2.roi };
    });
  }, [p]);

  const Field = ({ label, id, type = 'number', step = 'any', children, suffix }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {children ?? <input className="input" id={id} type={type} step={step} value={p[id] ?? ''} onChange={e => set(id, type === 'number' ? num_(e.target.value) : e.target.value)} />}
        {suffix && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px,3.5vw,28px)', fontWeight: 800 }}>კალკულატორი</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>ფინანსური ანალიზი: ერთი ბინა, სიმულაცია, სენსიტიურობა</p>
          </div>
          <a href="/flips" className="btn">← ბინების სია</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,320px) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>

          {/* left: inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* property */}
            <div className="card">
              <h2 className="card-title">ქონება</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="ფართი, კვ.მ." id="sqm" />
                <Field label="ყიდვის ფასი კვ.მ.-ზე, $" id="buyPsm" />
                <Field label="ყიდვის ხარჯი, %" id="buyExtraPct" suffix="%" />
                <Field label="რემონტი კვ.მ.-ზე, $" id="renoPsm" />
                <Field label="გასაყიდი ფასი კვ.მ.-ზე, $" id="askPrice" />
                <Field label="მაკლერი, %" id="brokerPct" suffix="%" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label">გადასახადი</label>
                  <select className="select" value={p.taxPct} onChange={e => set('taxPct', Number(e.target.value))}>
                    <option value={0}>0% — გადასახადის გარეშე</option>
                    <option value={5}>5% — ფიზიკური პირი</option>
                    <option value={15}>15% — კომპანია</option>
                    <option value={20}>20% — სისტემატური</option>
                  </select>
                </div>
              </div>
            </div>

            {/* capital */}
            <div className="card">
              <h2 className="card-title">კაპიტალი</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="საკუთარი კაპიტალი, $" id="ownCap" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label">ინვესტორის კაპიტალი</label>
                  <select className="select" value={p.invMode} onChange={e => set('invMode', e.target.value)}>
                    <option value="none">არა</option>
                    <option value="hybrid">ჰიბრიდული (მოგების შეუფარდება)</option>
                  </select>
                </div>
                {p.invMode !== 'none' && <Field label="ინვესტორის კაპიტალი, $" id="invCap" />}
                <Field label="ციკლის ხანგრძლივობა, დღე" id="cycleDays" />
                <Field label="სამოქმედო ჰორიზონტი, თვე" id="horizonMonths" />
              </div>
            </div>

            {/* scenarios */}
            {canEdit && (
              <div className="card">
                <h2 className="card-title">სცენარები</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <input className="input" placeholder="სახელი" value={scenName} onChange={e => setScenName(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-primary btn-sm" onClick={saveScenario} disabled={loadingSc || !scenName.trim()}>შენახვა</button>
                </div>
                {scenarios.length === 0 && <div className="empty" style={{ fontSize: 13 }}>სცენარები არ არის.</div>}
                {scenarios.map(sc => (
                  <div key={sc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, padding: 0 }} onClick={() => loadScenario(sc)}>{sc.name}</button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }} onClick={() => deleteScenario(sc.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* right: results */}
          <div>
            {/* tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
              {TABS.map(([k, n]) => (
                <button key={k} className={`btn${tab === k ? ' btn-primary' : ''}`} onClick={() => setTab(k)} style={{ borderRadius: 8 }}>{n}</button>
              ))}
            </div>

            {/* unit tab */}
            {tab === 'unit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* quick summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {[
                    { label: 'ღირებულება', val: usd(u.cost) },
                    { label: 'მოგება', val: usd(u.profit), color: u.profit >= 0 ? 'var(--success)' : 'var(--danger)' },
                    { label: 'უკუგება', val: pct(u.roi), color: u.roi >= 0 ? 'var(--success)' : 'var(--danger)' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
                      <div style={{ fontFamily: 'var(--font-mono,monospace)', fontWeight: 700, fontSize: 22, color: k.color }}>{k.val}</div>
                    </div>
                  ))}
                </div>

                {/* detailed breakdown */}
                <div className="card">
                  <h2 className="card-title">ერთი ბინის ეკონომიკა</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '8px 20px', fontSize: 14 }}>
                    {[
                      ['ფართი', `${num(p.sqm)} კვ.მ.`],
                      ['ყიდვა', usd(u.buy)],
                      [`ყიდვის ხარჯი (${p.buyExtraPct}%)`, usd(u.extra)],
                      ['რემონტი', usd(u.reno)],
                      ['სულ ღირებულება', usd(u.cost), true],
                      ['---'],
                      ['გასაყიდი ფასი (სულ)', usd(u.gross)],
                      [`მაკლერი (${p.brokerPct}%)`, usd(-u.broker)],
                      [Number(p.taxPct) ? `გადასახადი ${p.taxPct}% (ბაზა ${usd(Math.max(0,u.taxBase))})` : 'გადასახადი', usd(-u.tax)],
                      ['---'],
                      ['წმინდა მოგება', usd(u.profit), true, u.profit >= 0 ? 'var(--success)' : 'var(--danger)'],
                      ['უკუგება (ROI)', pct(u.roi), false, u.roi >= 0 ? 'var(--success)' : 'var(--danger)'],
                      ['ყიდვის ფასი კვ.მ.-ზე', usd(p.buyPsm)],
                      ['გასაყიდი ფასი კვ.მ.-ზე', usd(p.askPrice)],
                      ['ზღვარი', usd(be), false, 'var(--text-muted)', 'გასაყიდი ფასი სადაც მოგება = 0'],
                    ].map(([label, val, bold, color, hint], i) => {
                      if (label === '---') return <div key={i} style={{ gridColumn: '1/-1', borderTop: '1px solid var(--border)', margin: '2px 0' }} />;
                      return (
                        <>
                          <div key={`l${i}`} style={{ color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                            {label}
                            {hint && <span style={{ fontSize: 11, background: 'var(--bg)', borderRadius: 4, padding: '1px 5px' }}>{hint}</span>}
                          </div>
                          <div key={`v${i}`} style={{ fontFamily: 'monospace', textAlign: 'right', fontWeight: bold ? 700 : 400, color: color }}>{val}</div>
                        </>
                      );
                    })}
                  </div>
                </div>

                {/* bar chart */}
                <div className="card">
                  <h2 className="card-title">სტრუქტურა</h2>
                  {[[usd(u.buy), u.buy, u.cost, 'ყიდვა', 'var(--accent)'],
                    [usd(u.extra), u.extra, u.cost, 'ყიდვის ხარჯი', '#7c9cbf'],
                    [usd(u.reno), u.reno, u.cost, 'რემონტი', '#c27a1e'],
                    [usd(u.broker), u.broker, u.cost, 'მაკლერი', '#888'],
                    [usd(u.tax), u.tax, u.cost, 'გადასახადი', '#a06060'],
                    [usd(u.profit), u.profit, u.cost, 'მოგება', u.profit >= 0 ? 'var(--success)' : 'var(--danger)'],
                  ].map(([label2, val2, base, name, color]) => (
                    <div key={name} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px', gap: 10, alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                      <span>{name}</span>
                      <div style={{ height: 10, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: color, width: `${Math.abs(val2) / base * 100}%` }} />
                      </div>
                      <span style={{ fontFamily: 'monospace', textAlign: 'right', color }}>{label2}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* simulation tab */}
            {tab === 'sim' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {[
                    { label: 'ციკლების რაოდენობა', val: sim.totalCycles },
                    { label: 'საკუთარი მოგება', val: usd(sim.totalOwnProfit), color: sim.totalOwnProfit >= 0 ? 'var(--success)' : 'var(--danger)' },
                    { label: 'საბოლოო კაპიტალი', val: usd(sim.finalOwnCash) },
                  ].map((k, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
                      <div style={{ fontFamily: 'var(--font-mono,monospace)', fontWeight: 700, fontSize: 20, color: k.color }}>{k.val}</div>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ overflowX: 'auto' }}>
                  <h2 className="card-title">ციკლის ცხრილი</h2>
                  {sim.cycles.length === 0 ? (
                    <div className="empty">კაპიტალი არ კმარა ერთი ციკლისთვისაც. გაზარდე კაპიტალი ან შეამცირე ღირებულება.</div>
                  ) : (
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 600 }}>
                      <thead><tr>
                        {['#','დაწყება','დასრულება','ღირებულება','საინვ.','საკუთარი','სულ მოგება','საკ. მოგება','ინვ. გადახდა','კაშ'].map((h, i) => (
                          <th key={i} style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, textAlign: i >= 3 ? 'right' : 'center' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {sim.cycles.map(c => (
                          <tr key={c.num}>
                            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)' }}>{c.num}</td>
                            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{c.startDay}დ</td>
                            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{c.endDay}დ</td>
                            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>{usd(c.totalNeeded)}</td>
                            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>{usd(c.actualInv)}</td>
                            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>{usd(c.actualOwn)}</td>
                            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace', color: c.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{usd(c.profit)}</td>
                            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: c.ownProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{usd(c.ownProfit)}</td>
                            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>{c.actualInv > 0 ? usd(c.invReturn) : '—'}</td>
                            <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>{usd(c.ownCashAfter)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--bg)' }}>
                          <td colSpan={6} style={{ padding: '8px 8px', fontWeight: 700, fontSize: 13 }}>სულ</td>
                          <td style={{ padding: '8px 8px', fontFamily: 'monospace', textAlign: 'right', fontWeight: 700 }}>{usd(sim.totalProfit)}</td>
                          <td style={{ padding: '8px 8px', fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{usd(sim.totalOwnProfit)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>

                {/* visual timeline */}
                {sim.cycles.length > 0 && (
                  <div className="card">
                    <h2 className="card-title">მოგების დინამიკა</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6 }}>
                      {sim.cycles.map(c => {
                        let runSum = 0;
                        for (let i = 0; i < c.num - 1; i++) runSum += sim.cycles[i].ownProfit;
                        return (
                          <div key={c.num} style={{ display: 'grid', gridTemplateColumns: '30px minmax(0,1fr) 80px', gap: 10, alignItems: 'center', fontSize: 13 }}>
                            <span style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{c.num}</span>
                            <div style={{ height: 14, background: 'var(--bg)', borderRadius: 3 }}>
                              <div style={{ height: '100%', background: c.ownProfit >= 0 ? 'var(--success)' : 'var(--danger)', borderRadius: 3, width: `${Math.min(100, Math.abs(c.ownProfit) / (sim.totalOwnProfit || 1) * 100 * sim.totalCycles)}%` }} />
                            </div>
                            <span style={{ fontFamily: 'monospace', textAlign: 'right', color: c.ownProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{usd(c.ownProfit)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* sensitivity tab */}
            {tab === 'sens' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="card">
                  <h2 className="card-title">სენსიტიურობა — გასაყიდი ფასი</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>ბაზისური ფასი: {usd(p.askPrice * p.sqm)} ({usd(p.askPrice)} კვ.მ.-ზე). ბრეიქ-ივენი: {usd(be)} კვ.მ.-ზე.</p>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                    <thead><tr>
                      {['ცვლილება','ფასი კვ.მ.-ზე','სულ ფასი','მოგება','ROI'].map((h, i) => (
                        <th key={i} style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500, textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {sensRows.map(row => (
                        <tr key={row.delta} style={{ background: row.delta === 0 ? 'var(--accent-soft,rgba(0,100,200,0.06))' : undefined }}>
                          <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontWeight: row.delta === 0 ? 700 : 400 }}>
                            {row.delta === 0 ? 'ბაზისი' : `${row.delta > 0 ? '+' : ''}${row.delta}%`}
                          </td>
                          <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', textAlign: 'right' }}>{usd(row.askPrice)}</td>
                          <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', textAlign: 'right' }}>{usd(row.askPrice * p.sqm)}</td>
                          <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', textAlign: 'right', color: row.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: row.delta === 0 ? 700 : 400 }}>{usd(row.profit)}</td>
                          <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', textAlign: 'right', color: row.roi >= 0 ? 'var(--success)' : 'var(--danger)' }}>{pct(row.roi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* reno sensitivity */}
                <div className="card">
                  <h2 className="card-title">სენსიტიურობა — რემონტი</h2>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                    <thead><tr>
                      {['ცვლილება','რემონტი კვ.მ.-ზე','სულ რემონტი','მოგება','ROI'].map((h, i) => (
                        <th key={i} style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500, textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {[-20,-10,0,10,20,30].map(delta => {
                        const reno2 = p.renoPsm * (1 + delta / 100);
                        const u2 = unit({ ...p, renoPsm: reno2 });
                        return (
                          <tr key={delta} style={{ background: delta === 0 ? 'var(--accent-soft,rgba(0,100,200,0.06))' : undefined }}>
                            <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontWeight: delta === 0 ? 700 : 400 }}>
                              {delta === 0 ? 'ბაზისი' : `${delta > 0 ? '+' : ''}${delta}%`}
                            </td>
                            <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', textAlign: 'right' }}>{usd(reno2)}</td>
                            <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', textAlign: 'right' }}>{usd(u2.reno)}</td>
                            <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', textAlign: 'right', color: u2.profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: delta === 0 ? 700 : 400 }}>{usd(u2.profit)}</td>
                            <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', textAlign: 'right', color: u2.roi >= 0 ? 'var(--success)' : 'var(--danger)' }}>{pct(u2.roi)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
