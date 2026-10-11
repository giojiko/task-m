// GET /api/rates — USD and CNY to GEL exchange rates from kursi.ge.
// Server-side fetch, cached for 30 minutes, so the browser never calls kursi.ge directly.
import { getSessionUser, unauthorized } from '@/lib/auth-guard';

const SOURCE = 'https://api-core.kursi.ge/api/public/currencies';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  try {
    const res = await fetch(SOURCE, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`kursi.ge ${res.status}`);
    const list = await res.json();
    const pick = (code) => {
      const x = list.find(v => v.baseCurrencyCode === 'GEL' && v.secondaryCurrencyCode === code);
      return x ? { sell: x.sellRate, buy: x.buyRate, nbg: x.nbgRate } : null;
    };
    return Response.json({ source: 'kursi.ge', at: new Date().toISOString(), USD: pick('USD'), CNY: pick('CNY') });
  } catch (e) {
    return Response.json({ error: 'RATE_UNAVAILABLE', message: String(e?.message || e) }, { status: 502 });
  }
}
