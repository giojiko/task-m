// Pure calculation functions for the flips module.
// Ported from calculator-reference.html and ledger-reference.html.
// No React, no side-effects — safe to unit-test in isolation.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  category: string;
  kind: 'mat' | 'lab';
  amount: number;
  note?: string;
  date?: string;
}

export interface FlipRecord {
  status: 'bought' | 'reno' | 'ready' | 'sold';
  buyPrice: number;
  buyDate?: string;
  buyExtra: number;
  sqm: number;
  askPrice: number;
  salePrice: number;
  saleDate?: string;
  readyDate?: string;
  brokerMode: 'pct' | 'amt';
  brokerPct: number;
  brokerAmt: number;
  otherSaleCost: number;
  taxPct: number; // 0 | 5 | 15 | 20
}

export interface FlipCalc {
  mat: number;
  lab: number;
  reno: number;
  byCat: Record<string, { m: number; l: number }>;
  cost: number;
  price: number;
  sold: boolean;
  broker: number;
  other: number;
  taxBase: number;
  tax: number;
  profit: number;
  held: number;   // days from buy to sale (or today)
  roi: number;    // profit / cost
  annual: number; // roi * 365 / held
  sqm: number;
  buySqm: number;
  renoSqm: number;
  priceSqm: number;
  renoDays: number;
  sellDays: number;
}

// ─── Ledger calc ──────────────────────────────────────────────────────────────

function num(x: unknown): number {
  const n = parseFloat(String(x ?? ''));
  return isFinite(n) ? n : 0;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string | undefined | null, b?: string | null): number {
  if (!a) return 0;
  const d = (new Date(b ?? todayStr()).getTime() - new Date(a).getTime()) / 864e5;
  return isFinite(d) ? Math.max(0, Math.round(d)) : 0;
}

export function calcFlip(f: FlipRecord, expenses: Expense[]): FlipCalc {
  let mat = 0, lab = 0;
  const byCat: Record<string, { m: number; l: number }> = {};
  for (const e of expenses) {
    const a = num(e.amount);
    if (e.kind === 'lab') lab += a; else mat += a;
    const c = byCat[e.category] ?? (byCat[e.category] = { m: 0, l: 0 });
    if (e.kind === 'lab') c.l += a; else c.m += a;
  }
  const reno = mat + lab;
  const buy = num(f.buyPrice), extra = num(f.buyExtra), sqm = num(f.sqm);
  const cost = buy + extra + reno;
  const sold = f.status === 'sold' && num(f.salePrice) > 0;
  const price = sold ? num(f.salePrice) : num(f.askPrice);
  const broker = f.brokerMode === 'amt' ? num(f.brokerAmt) : price * num(f.brokerPct) / 100;
  const other = num(f.otherSaleCost);
  const taxRate = num(f.taxPct) / 100;
  const taxBase = taxRate === 0.15
    ? price - cost - broker - other
    : price - buy - reno;
  const tax = price > 0 ? Math.max(0, taxBase) * taxRate : 0;
  const profit = price > 0 ? price - cost - broker - other - tax : 0;
  const held = daysBetween(f.buyDate, sold ? f.saleDate : null);
  const roi = cost ? profit / cost : 0;
  const renoDays = daysBetween(f.buyDate, f.readyDate || undefined);
  const sellDays = f.readyDate ? daysBetween(f.readyDate, sold ? f.saleDate : null) : 0;
  return {
    mat, lab, reno, byCat, cost, price, sold, broker, other,
    taxBase, tax, profit, held, roi,
    annual: held ? roi * 365 / held : 0,
    sqm: sqm,
    buySqm: sqm ? buy / sqm : 0,
    renoSqm: sqm ? reno / sqm : 0,
    priceSqm: sqm && price ? price / sqm : 0,
    renoDays, sellDays,
  };
}

// ─── Calculator (scenario simulator) ─────────────────────────────────────────

export interface ScenarioParams {
  own: number;
  inv: number;
  buy: number;
  extra: number;
  reno: number;
  hold: number;       // monthly holding cost
  sale: number;       // sale price (may be stress-adjusted by caller)
  comm: number;       // fraction e.g. 0.02
  commMode: 'pct' | 'amt';
  commAmt: number;
  invAmt: number;     // manual payout per frequency
  months: number;     // cycle length
  apts: number;       // manual apt count (when aptMode='fixed')
  aptMode: 'auto' | 'fixed';
  horizon: number;    // planning months
  reinvest: boolean;
  mode: 'fixed' | 'share' | 'hybrid' | 'manual' | 'service';
  rate: number;       // fraction e.g. 0.18
  share: number;      // fraction e.g. 0.30
  freq: number;       // payout frequency months
  tax: number;        // fraction e.g. 0.20
  vat: boolean;
  vatInput: number;   // fraction of reno with invoice
  scheme: 'mix' | 'service';
  invTerm: number;    // investor term in months (0 = full horizon)
  personal: number;   // monthly personal expense
  svcShare: number;   // fraction, service-scheme only
  stressPrice?: number; // pct delta e.g. -5
  stressDelay?: number; // additional months
}

export interface UnitCalc {
  cap: number;
  commission: number;
  vat: number;
  pre: number;
  base: number;
  tax: number;
  net: number;
  holdTotal: number;
}

export interface CycleResult {
  apts: number;
  capital: number;
  net: number;
  invRet: number;
  mine: number;
  idle: number;
  u: UnitCalc;
  c?: number;
  month?: number;
  active?: boolean;
  invBack?: number;
  invPaid?: number;
  owed?: number;
  invAfter?: number;
  ownAfter?: number;
  cumKeep?: number;
  spend?: number;
  keep?: number;
}

export interface SimResult {
  rows: CycleResult[];
  tm: number;     // total mine
  ti: number;     // total investor
  ts: number;     // total spent (personal)
  tk: number;     // total kept
  short: number;  // cycles where personal not covered
  years: number;
  n: number;      // cycle count
  invMonths: number;
  returned: number;
  returnedAt: number | null;
  invEnd: number;
  owedEnd: number;
  pays: number[];
  ownEnd: number;
}

export function calcUnit(p: ScenarioParams): UnitCalc {
  const cap = p.buy + p.extra + p.reno + p.hold * p.months;
  const commission = p.commMode === 'amt' ? p.commAmt : p.sale * p.comm;
  const vat = p.vat ? Math.max(0, (p.sale - p.reno * p.vatInput) * 18 / 118) : 0;
  const pre = p.sale - commission - vat - cap;
  const base = p.tax === 0.15 ? pre : p.sale - vat - p.buy - p.reno;
  const tax = Math.max(0, base) * p.tax;
  return { cap, commission, vat, pre, base, tax, net: pre - tax, holdTotal: p.hold * p.months };
}

export function calcCycle(
  p: ScenarioParams,
  ownCap: number,
  _first: boolean,
  invCap: number = p.inv,
): CycleResult {
  const u = calcUnit(p);
  const capital = ownCap + invCap;
  const fit = Math.max(0, Math.floor(capital / u.cap));
  const apts = p.aptMode === 'auto' ? fit : Math.min(p.apts, fit);
  const net = apts * u.net;
  const svc = p.mode === 'service';
  if (svc) {
    const mine = Math.max(0, net) * p.svcShare;
    return { apts, capital, net, invRet: net - mine, mine, idle: capital - apts * u.cap, u };
  }
  const fixed = invCap * p.rate * p.months / 12;
  const shareAmt = Math.max(0, net) * p.share;
  const invRet = invCap <= 0 ? 0
    : p.mode === 'manual' ? p.invAmt * p.months / p.freq
    : p.mode === 'fixed' ? fixed
    : p.mode === 'share' ? shareAmt
    : Math.max(fixed, shareAmt); // hybrid
  return { apts, capital, net, invRet, mine: net - invRet, idle: capital - apts * u.cap, u };
}

export function simulate(p: ScenarioParams): SimResult {
  const n = Math.floor(p.horizon / p.months);
  const svc = p.mode === 'service';
  let own = p.own, inv = p.inv;
  let tm = 0, ti = 0, ts = 0, tk = 0, short = 0;
  let invMonths = 0, returned = 0, returnedAt: number | null = null;
  let owed = 0;
  const pays: number[] = [];
  const rows: CycleResult[] = [];

  for (let c = 1; c <= n; c++) {
    const active = inv > 0 && (p.invTerm <= 0 || (c - 1) * p.months < p.invTerm);
    const r = calcCycle(p, own + (svc ? 0 : owed), c === 1, active ? inv : 0);
    r.c = c; r.month = c * p.months; r.active = active; r.invBack = 0; r.invPaid = 0;
    if (active) invMonths = r.month!;
    r.spend = p.personal * p.months;
    r.keep = r.mine - r.spend!;
    if (r.keep! < 0) short++;
    tm += r.mine; ti += r.invRet; ts += r.spend!; tk += r.keep!;
    if (p.reinvest) { if (svc) inv += r.invRet; else own += r.keep!; }
    const ending = active && p.invTerm > 0 && r.month! >= p.invTerm;
    if (!svc && active) {
      owed += r.invRet;
      const crossed = Math.floor(r.month! / p.freq) > Math.floor((r.month! - p.months) / p.freq);
      if (crossed || ending) { r.invPaid = owed; if (owed) pays.push(owed); owed = 0; }
    }
    if (svc && active) {
      r.invPaid = p.reinvest ? 0 : r.invRet;
      if (r.invPaid) pays.push(r.invPaid);
    }
    r.owed = owed;
    if (ending) {
      r.invBack = inv; returned = inv; returnedAt = r.month!;
      if (svc && p.reinvest) pays.push(inv - p.inv);
      inv = 0;
    }
    r.invAfter = inv;
    r.ownAfter = svc ? inv : (p.reinvest ? own : p.own + tk);
    r.cumKeep = tk;
    rows.push(r);
  }
  const years = (n * p.months) / 12 || 1;
  return {
    rows, tm, ti, ts, tk, short, years, n, invMonths,
    returned, returnedAt, invEnd: inv, owedEnd: owed, pays,
    ownEnd: svc ? tk : (rows.length ? rows[rows.length - 1].ownAfter! : p.own),
  };
}

export function breakEven(p: ScenarioParams): number {
  let lo = 0, hi = p.buy * 4;
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    calcCycle({ ...p, sale: m }, p.own, true).mine > 0 ? (hi = m) : (lo = m);
  }
  return hi;
}
