import { describe, it, expect } from 'vitest';
import { calcFlip, simulate, type ScenarioParams, type FlipRecord, type Expense } from '../calc';

// ─── Acceptance test 1: single flip ──────────────────────────────────────────
// buy=60000, buyExtra=500, reno=18800 (mat=13600 lab=5200),
// askPrice=88000, brokerPct=2, taxPct=20
// Expected: cost=79300, broker=1760, taxBase=9200, tax=1840, profit=5100, roi≈6.4%

describe('calcFlip', () => {
  const flip: FlipRecord = {
    status: 'ready',
    buyPrice: 60000,
    buyDate: '2024-01-01',
    buyExtra: 500,
    sqm: 60,
    askPrice: 88000,
    salePrice: 0,
    brokerMode: 'pct',
    brokerPct: 2,
    brokerAmt: 0,
    otherSaleCost: 0,
    taxPct: 20,
  };
  const expenses: Expense[] = [
    { id: '1', category: 'ელექტროობა', kind: 'mat', amount: 8000 },
    { id: '2', category: 'სანტექნიკა', kind: 'mat', amount: 5600 },
    { id: '3', category: 'ელექტროობა', kind: 'lab', amount: 2000 },
    { id: '4', category: 'სანტექნიკა', kind: 'lab', amount: 3200 },
  ];

  it('mat=13600 lab=5200 reno=18800', () => {
    const c = calcFlip(flip, expenses);
    expect(c.mat).toBe(13600);
    expect(c.lab).toBe(5200);
    expect(c.reno).toBe(18800);
  });

  it('cost = buy + extra + reno = 79300', () => {
    expect(calcFlip(flip, expenses).cost).toBe(79300);
  });

  it('broker = 88000 * 2% = 1760', () => {
    expect(calcFlip(flip, expenses).broker).toBe(1760);
  });

  it('taxBase (20%) = price - buy - reno = 88000-60000-18800 = 9200', () => {
    expect(calcFlip(flip, expenses).taxBase).toBe(9200);
  });

  it('tax = 9200 * 20% = 1840', () => {
    expect(calcFlip(flip, expenses).tax).toBe(1840);
  });

  it('profit = 88000 - 79300 - 1760 - 1840 = 5100', () => {
    expect(calcFlip(flip, expenses).profit).toBe(5100);
  });

  it('roi ≈ 6.4%', () => {
    const { roi } = calcFlip(flip, expenses);
    expect((roi * 100).toFixed(1)).toBe('6.4');
  });

  it('15% tax: base = price - cost - broker - other', () => {
    const f15 = { ...flip, taxPct: 15 };
    const c = calcFlip(f15, expenses);
    // base = 88000 - 79300 - 1760 - 0 = 6940
    expect(c.taxBase).toBeCloseTo(6940, 0);
    expect(c.tax).toBeCloseTo(6940 * 0.15, 0);
  });

  it('status=sold uses salePrice', () => {
    const sold = { ...flip, status: 'sold' as const, salePrice: 90000, saleDate: '2024-06-01' };
    const c = calcFlip(sold, expenses);
    expect(c.sold).toBe(true);
    expect(c.price).toBe(90000);
  });

  it('broker fixed amount', () => {
    const f = { ...flip, brokerMode: 'amt' as const, brokerAmt: 2000 };
    expect(calcFlip(f, expenses).broker).toBe(2000);
  });
});

// ─── Acceptance test 2: calculator simulation ─────────────────────────────────
// own=120000, inv=50000, buy=60000, extra=500, reno=20000, hold=100, sale=88000,
// comm=2%, cycle=2m, hybrid 18% or 30%, freq=2, horizon=12m, tax=20%, personal=2000
// Expected: investor receives ~14184 total in 6 payments, principal returned at month 12

describe('simulate', () => {
  const base: ScenarioParams = {
    own: 120000, inv: 50000,
    buy: 60000, extra: 500, reno: 20000, hold: 100, sale: 88000,
    comm: 0.02, commMode: 'pct', commAmt: 0, invAmt: 0,
    months: 2, apts: 2, aptMode: 'auto',
    horizon: 12, reinvest: false,
    mode: 'hybrid', rate: 0.18, share: 0.30, freq: 2,
    tax: 0.20, vat: false, vatInput: 0.60,
    scheme: 'mix', invTerm: 12, personal: 2000,
    svcShare: 0.40,
  };

  it('runs 6 cycles in 12 months', () => {
    const s = simulate(base);
    expect(s.n).toBe(6);
  });

  it('investor principal returned at month 12', () => {
    const s = simulate(base);
    expect(s.returnedAt).toBe(12);
    expect(s.returned).toBe(50000);
  });

  it('investor total payout is positive', () => {
    const s = simulate(base);
    expect(s.ti).toBeGreaterThan(0);
  });

  it('investor receives ~14000–15000 total (6 payments)', () => {
    const s = simulate(base);
    // reference HTML gives ~14184; allow ±500 tolerance
    expect(s.ti).toBeGreaterThan(13500);
    expect(s.ti).toBeLessThan(16000);
  });

  it('reinvest=true grows own capital', () => {
    const r = simulate({ ...base, reinvest: true });
    expect(r.ownEnd).toBeGreaterThan(base.own);
  });
});
