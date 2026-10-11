// SmartPro — switch and socket pricing logic.
// Pure functions, no React and no I/O, so they work the same on the client and on the server.
// Ported 1:1 from the working prototype (reference/SmartPro-kalkulatori.html).

export const DEFAULT_SWITCH_SETTINGS = {
  currency: 'USD',        // supplier price currency: 'USD' or 'CNY'
  usd: 2.70,              // GEL per 1 USD (overwritten by /api/rates when autoRate is on)
  cny: 0.38,              // GEL per 1 CNY
  autoRate: true,
  rateType: 'sell',       // 'sell' = kursi.ge sell rate, 'nbg' = National Bank of Georgia rate
  rateAt: null,
  freight: 3,             // USD per kilogram, China warehouse to Tbilisi
  customs: 0,             // percent
  bank: 1,                // percent, bank transfer fee
  other: 0,               // percent, other import costs
  otherFix: 0,            // GEL per piece
  shipFix: 0,             // GEL per whole shipment
  shipQty: 1000,          // pieces in one shipment (shipFix is spread over these)
  vat: false,             // include 18 percent VAT in cost
  markup: 80,             // default markup percent
  round: 0,               // round sale price up to this step in GEL (0 = no rounding)
  validity: 7,            // offer validity in days
};

export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Supplier unit price for a product and colour (colour override wins). */
export function unitPrice(prices, itemId, color) {
  const p = prices?.[itemId];
  if (!p) return null;
  const o = p.colors && num(p.colors[color]);
  return o != null ? o : num(p.price);
}

export function fixedPerUnit(S) {
  const q = num(S.shipQty) || 0;
  return (num(S.otherFix) || 0) + (q > 0 ? (num(S.shipFix) || 0) / q : 0);
}

/** Full cost breakdown for one piece, in GEL. Returns null when the product has no price. */
export function costParts(prices, settings, itemId, color) {
  const S = { ...DEFAULT_SWITCH_SETTINGS, ...settings };
  const price = unitPrice(prices, itemId, color);
  if (price == null) return null;
  const rate = S.currency === 'CNY' ? num(S.cny) : num(S.usd);
  const usd = num(S.usd) || 0;
  const weightGrams = num(prices[itemId]?.weight) || 0;
  const goods = price * rate;
  const bank = goods * (num(S.bank) || 0) / 100;
  const freight = weightGrams / 1000 * (num(S.freight) || 0) * usd;
  const base = goods + bank + freight;
  const customs = base * (num(S.customs) || 0) / 100;
  const other = (base + customs) * (num(S.other) || 0) / 100;
  const fixed = fixedPerUnit(S);
  const beforeVat = base + customs + other + fixed;
  const vat = S.vat ? beforeVat * 0.18 : 0;
  return { price, weightGrams, goods, bank, freight, customs, other, fixed, vat, total: beforeVat + vat };
}

export function roundUp(v, step) {
  const r = num(step) || 0;
  return r > 0 ? Math.ceil(v / r - 1e-9) * r : Math.round(v * 100) / 100;
}

/** Markup for a product: product-level override, otherwise the default. */
export function productMarkup(prices, settings, itemId) {
  const v = num(prices?.[itemId]?.markup);
  return v != null ? v : (num(settings?.markup) ?? DEFAULT_SWITCH_SETTINGS.markup);
}

/**
 * One offer line: { id, color, qty, sale?, mk? }
 *   sale = manual price per piece (wins over markup)
 *   mk   = line markup percent
 * Returns cost, sale price, whether the price is manual, effective markup and profit per piece.
 */
export function lineCalc(prices, settings, line) {
  const cp = costParts(prices, settings, line.id, line.color);
  const cost = cp ? cp.total : null;
  const manual = num(line.sale) != null;
  const mk = num(line.mk) != null ? num(line.mk) : productMarkup(prices, settings, line.id);
  let sale = null;
  if (manual) sale = num(line.sale);
  else if (cost != null) sale = roundUp(cost * (1 + mk / 100), settings?.round);
  const effectiveMarkup = cost && sale != null ? (sale / cost - 1) * 100 : null;
  const profitPerUnit = cost != null && sale != null ? sale - cost : null;
  return { parts: cp, cost, sale, manual, markup: manual ? effectiveMarkup : mk, effectiveMarkup, profitPerUnit };
}

/** Totals for a whole offer (lines without a price are counted in `missing`). */
export function offerTotals(prices, settings, lines) {
  let cost = 0, total = 0, missing = 0;
  for (const l of lines) {
    const k = lineCalc(prices, settings, l);
    if (k.cost == null || k.sale == null) { missing++; continue; }
    cost += k.cost * l.qty;
    total += k.sale * l.qty;
  }
  const profit = total - cost;
  return {
    cost: Math.round(cost * 100) / 100,
    total: Math.round(total * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    avgMarkup: cost ? profit / cost * 100 : 0,
    marginShare: total ? profit / total * 100 : 0,
    missing,
  };
}

/** Offer number in the format already used by the prototype: SP-YYMMDD-HHMMSS */
export function offerNumber(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `SP-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
