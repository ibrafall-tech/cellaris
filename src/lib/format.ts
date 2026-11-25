export type Currency = 'USD' | 'EUR' | 'XOF';

/** Taux indicatifs (base USD). EUR/XOF est fixe (parité 655,957). */
const RATE: Record<Currency, number> = { USD: 1, EUR: 0.92, XOF: 0.92 * 655.957 };
const SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€', XOF: 'FCFA' };

const nf = (d: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });
const cache = new Map<number, Intl.NumberFormat>();
export function num(v: number, digits = 0) {
  let f = cache.get(digits);
  if (!f) cache.set(digits, (f = nf(digits)));
  return f.format(v);
}

const tight = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const tight2 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
/** 2 500 000 → « 2,5 M » ; 200 000 → « 200 k » */
export function compact(v: number, digits = 1) {
  const f = digits >= 2 ? tight2 : tight;
  const a = Math.abs(v);
  if (a >= 1e9) return f.format(v / 1e9) + ' Md';
  if (a >= 1e6) return f.format(v / 1e6) + ' M';
  if (a >= 1e4) return f.format(v / 1e3) + ' k';
  return f.format(v);
}

export function money(usd: number, c: Currency, compactMode = true) {
  const v = usd * RATE[c];
  const s = compactMode ? compact(v, 1) : num(v, 0);
  return c === 'XOF' ? `${s} ${SYMBOL[c]}` : c === 'EUR' ? `${s} €` : `${s} $`;
}

export const currencySymbol = (c: Currency) => SYMBOL[c];
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Débit lisible : 2 083 333 Mbps → « 2,08 Tbit/s ». */
export function rate(mbps: number) {
  if (mbps >= 1e6) return `${num(mbps / 1e6, 2)} Tbit/s`;
  if (mbps >= 1e3) return `${num(mbps / 1e3, 1)} Gbit/s`;
  return `${num(mbps, 1)} Mbit/s`;
}
