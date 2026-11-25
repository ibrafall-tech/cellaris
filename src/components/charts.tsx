import { useEffect, useId, useRef, useState } from 'react';
import { num } from '../lib/format';
import { cx } from './ui';

/* Graphiques SVG faits main : zéro dépendance, rendu instantané, thèmes clair/sombre. */

/** Largeur réelle du conteneur, pour des textes SVG toujours lisibles. */
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function Ring({ value, size = 92, stroke = 9, color = 'var(--signal)', label, sub }: {
  value: number; size?: number; stroke?: number; color?: string; label: string; sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)' }} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="tnum font-display text-[19px] font-semibold text-ink">{num(v, 0)}<span className="text-[11px] text-muted">%</span></span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[12.5px] font-medium text-ink-2">{label}</div>
        {sub && <div className="text-[11px] text-muted">{sub}</div>}
      </div>
    </div>
  );
}

/** Cascade du bilan de liaison : de P_TX jusqu'au MAPL. */
export function Waterfall({ steps }: { steps: { label: string; value: number; kind: 'gain' | 'loss' | 'total' }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  let acc = 0;
  const bars = steps.map((s) => {
    if (s.kind === 'total') { const b = { ...s, from: 0, to: s.value }; acc = s.value; return b; }
    const from = acc; acc += s.value; return { ...s, from, to: acc };
  });
  const max = Math.max(...bars.map((b) => Math.max(b.from, b.to))) * 1.08;
  const [ref, W] = useWidth(640);
  const narrow = W < 460;
  const H = narrow ? 200 : 230, padL = 4, padB = 30, padT = 18;
  const bw = (W - padL * 2) / bars.length;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  return (
    <div ref={ref}>
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full overflow-visible" role="img" aria-label="Bilan de liaison en cascade">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <line key={k} x1={0} x2={W} y1={y(max * k)} y2={y(max * k)} stroke="var(--line)" strokeDasharray="2 4" />
      ))}
      <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--line)" />
      {bars.map((b, i) => {
        const top = y(Math.max(b.from, b.to));
        const h = Math.max(2, Math.abs(y(b.from) - y(b.to)));
        const color = b.kind === 'gain' ? 'var(--signal)' : b.kind === 'loss' ? 'var(--rose)' : 'var(--iris)';
        const x = padL + i * bw + bw * 0.18;
        return (
          <g key={b.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="cursor-default">
            <rect x={padL + i * bw} y={0} width={bw} height={H} fill="transparent" />
            <rect x={x} y={top} width={bw * 0.64} height={h} rx={5} fill={color}
              opacity={hover === null || hover === i ? 1 : 0.35} style={{ transition: 'all .4s cubic-bezier(.2,.8,.2,1)' }} />
            {i < bars.length - 1 && (
              <line x1={x + bw * 0.64} x2={x + bw} y1={y(b.to)} y2={y(b.to)} stroke="var(--muted)" strokeDasharray="2 3" opacity={0.6} />
            )}
            <text x={x + bw * 0.32} y={top - 6} textAnchor="middle" className="tnum fill-ink font-mono text-[11px] font-medium">
              {b.kind === 'loss' ? '−' : b.kind === 'gain' && i > 0 ? '+' : ''}{num(Math.abs(b.value), narrow ? 0 : 1)}
            </text>
            <text x={x + bw * 0.32} y={H - 10} textAnchor="middle" className={cx(narrow ? 'text-[9.5px]' : 'text-[11px]', hover === i ? 'fill-ink' : 'fill-muted')}>{b.label}</text>
          </g>
        );
      })}
    </svg>
    </div>
  );
}

/** Barres horizontales comparatives. */
export function HBars({ items, format = (v) => num(v) }: {
  items: { label: string; value: number; color: string; note?: string }[]; format?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-3.5">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px]">
            <span className="text-ink-2">{it.label}{it.note && <span className="ml-1.5 text-muted">{it.note}</span>}</span>
            <span className="tnum font-mono font-semibold text-ink">{format(it.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{
              width: `${Math.max(1.5, (it.value / max) * 100)}%`, background: it.color,
              transition: 'width .6s cubic-bezier(.2,.8,.2,1)',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Radar des KPIs. */
export function Radar({ axes }: { axes: { label: string; value: number }[] }) {
  const S = 260, c = S / 2, R = 88;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return [c + Math.cos(a) * R * (v / 100), c + Math.sin(a) * R * (v / 100)] as const;
  };
  const poly = axes.map((a, i) => pt(i, Math.max(0, Math.min(100, a.value))).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto h-auto w-full max-w-[300px] overflow-visible" role="img" aria-label="Radar des indicateurs">
      {[25, 50, 75, 100].map((k) => (
        <polygon key={k} points={axes.map((_, i) => pt(i, k).join(',')).join(' ')} fill="none" stroke="var(--line)" />
      ))}
      {axes.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" />; })}
      <polygon points={poly} fill="var(--signal)" fillOpacity={0.18} stroke="var(--signal)" strokeWidth={2} strokeLinejoin="round"
        style={{ transition: 'all .5s cubic-bezier(.2,.8,.2,1)' }} />
      {axes.map((a, i) => {
        const [x, y] = pt(i, Math.max(0, Math.min(100, a.value)));
        const [lx, ly] = pt(i, 128);
        return (
          <g key={a.label}>
            <circle cx={x} cy={y} r={3.5} fill="var(--surface)" stroke="var(--signal)" strokeWidth={2} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-muted text-[10.5px]">{a.label}</text>
            <text x={lx} y={ly + 12} textAnchor="middle" dominantBaseline="middle" className="tnum fill-ink font-mono text-[10.5px] font-semibold">{num(a.value, 0)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Anneau de répartition (donut) à 2+ segments. */
export function Donut({ parts, center, sub }: { parts: { value: number; color: string }[]; center: string; sub: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = 52, C = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="relative mx-auto size-[150px]">
      <svg viewBox="0 0 140 140" className="size-full -rotate-90">
        <circle cx={70} cy={70} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={16} />
        {parts.map((p, i) => {
          const len = (p.value / total) * C;
          const el = (
            <circle key={i} cx={70} cy={70} r={r} fill="none" stroke={p.color} strokeWidth={16}
              strokeDasharray={`${Math.max(0, len - 3)} ${C}`} strokeDashoffset={-off}
              style={{ transition: 'all .6s cubic-bezier(.2,.8,.2,1)' }} />
          );
          off += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="tnum font-display text-[17px] font-semibold text-ink">{center}</div>
          <div className="text-[11px] text-muted">{sub}</div>
        </div>
      </div>
    </div>
  );
}

function niceStep(x: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1e-9))));
  const f = x / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

/** Courbes de sensibilité (sites en fonction d'un paramètre). */
export function LineChart({ data, xLabel, current, xFormat = (v) => num(v) }: {
  data: { x: number; coverage: number; capacity: number; final: number }[]; xLabel: string; current: number; xFormat?: (v: number) => string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth(640);
  const H = W < 460 ? 220 : 270, L = 48, R = 12, T = 18, B = 36;
  const xs = data.map((d) => d.x);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const raw = Math.max(1, ...data.map((d) => Math.max(d.coverage, d.capacity)));
  const step = niceStep(raw / 4);
  const yMax = Math.ceil((raw * 1.04) / step) * step;
  const sx = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = (v: number) => T + (H - T - B) * (1 - v / yMax);
  const path = (k: 'coverage' | 'capacity' | 'final') => data.map((d, i) => `${i ? 'L' : 'M'}${sx(d.x)},${sy(d[k])}`).join('');
  const h = hover !== null ? data[hover] : null;
  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full overflow-visible"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0, bd = Infinity;
          data.forEach((d, i) => { const dd = Math.abs(sx(d.x) - px); if (dd < bd) { bd = dd; best = i; } });
          setHover(best);
        }}
        onMouseLeave={() => setHover(null)} role="img" aria-label={`Sites requis en fonction de ${xLabel}`}>
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--signal)" stopOpacity={0.22} />
            <stop offset="1" stopColor="var(--signal)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step).map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke="var(--line)" strokeDasharray={v ? '2 4' : undefined} />
            <text x={L - 8} y={sy(v)} textAnchor="end" dominantBaseline="middle" className="tnum fill-muted font-mono text-[10.5px]">{num(v)}</text>
          </g>
        ))}
        {data.map((d, i) => (i % Math.ceil(data.length / Math.max(3, Math.floor(W / 80))) === 0 || i === data.length - 1) && (
          <text key={d.x} x={sx(d.x)} y={H - B + 18} textAnchor="middle" className="tnum fill-muted font-mono text-[10.5px]">{xFormat(d.x)}</text>
        ))}
        <path d={`${path('final')}L${sx(x1)},${sy(0)}L${sx(x0)},${sy(0)}Z`} fill={`url(#${id})`} />
        <path d={path('coverage')} fill="none" stroke="var(--iris)" strokeWidth={2} strokeDasharray="5 4" />
        <path d={path('capacity')} fill="none" stroke="var(--amber)" strokeWidth={2} strokeDasharray="5 4" />
        <path d={path('final')} fill="none" stroke="var(--signal)" strokeWidth={2.5} />
        {current >= x0 && current <= x1 && (
          <g>
            <line x1={sx(current)} x2={sx(current)} y1={T} y2={H - B} stroke="var(--ink)" strokeOpacity={0.35} />
            <text x={sx(current)} y={T - 4} textAnchor="middle" className="fill-ink-2 text-[10.5px] font-semibold">actuel</text>
          </g>
        )}
        {h && (
          <g>
            <line x1={sx(h.x)} x2={sx(h.x)} y1={T} y2={H - B} stroke="var(--signal)" strokeOpacity={0.5} />
            <circle cx={sx(h.x)} cy={sy(h.final)} r={4.5} fill="var(--surface)" stroke="var(--signal)" strokeWidth={2.5} />
          </g>
        )}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-2 right-2 rounded-xl border border-line bg-surface/95 px-3 py-2 text-[12px] shadow-card backdrop-blur">
          <div className="mb-1 font-semibold text-ink">{xLabel} : {xFormat(h.x)}</div>
          <div className="tnum flex justify-between gap-4 font-mono"><span className="text-signal">Final</span>{num(h.final)}</div>
          <div className="tnum flex justify-between gap-4 font-mono"><span className="text-iris">Couverture</span>{num(h.coverage)}</div>
          <div className="tnum flex justify-between gap-4 font-mono"><span className="text-amber">Capacité</span>{num(h.capacity)}</div>
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-[3px] w-4 rounded" style={{ background: i.dashed ? `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)` : i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
