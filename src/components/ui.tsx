import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { Icon, type IconName } from './Icon';
import { clamp, num } from '../lib/format';

export const cx = (...c: unknown[]) => c.filter((x) => typeof x === 'string' && x).join(' ');

/* ───────── Card ───────── */
export function Card({ children, className, title, icon, aside, pad = true }: {
  children: ReactNode; className?: string; title?: ReactNode; icon?: IconName; aside?: ReactNode; pad?: boolean;
}) {
  return (
    <section className={cx('rounded-2xl border border-line bg-surface shadow-card', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          <h3 className="flex items-center gap-2 font-display text-[13px] font-semibold tracking-wide text-ink-2 uppercase">
            {icon && <Icon name={icon} size={15} className="text-signal" />}
            {title}
          </h3>
          {aside}
        </header>
      )}
      <div className={cx(pad && 'p-5', title && pad && 'pt-3')}>{children}</div>
    </section>
  );
}

/* ───────── Tooltip (hover / focus) ───────── */
export function Hint({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group/hint relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-56 -translate-x-1/2 translate-y-1 rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] leading-snug font-medium text-bg opacity-0 shadow-lg transition duration-150 group-hover/hint:translate-y-0 group-hover/hint:opacity-100 group-focus-within/hint:translate-y-0 group-focus-within/hint:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

/* ───────── Segmented control ───────── */
export function Segmented<T extends string | number>({ value, options, onChange, size = 'md', className, label }: {
  value: T; options: { value: T; label: ReactNode; icon?: IconName }[]; onChange: (v: T) => void;
  size?: 'sm' | 'md'; className?: string; label: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="radiogroup" aria-label={label} className={cx('relative grid rounded-xl bg-surface-2 p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span aria-hidden className="absolute top-1 bottom-1 left-1 rounded-[9px] bg-surface shadow-card ring-1 ring-line transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }} />
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={cx('relative z-10 flex items-center justify-center gap-1.5 rounded-[9px] font-medium transition-colors',
            size === 'sm' ? 'h-7 text-xs' : 'h-8.5 text-[13px]',
            o.value === value ? 'text-ink' : 'text-muted hover:text-ink-2')}>
          {o.icon && <Icon name={o.icon} size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ───────── Champ numérique : slider + saisie ───────── */
export const ParamField = memo(function ParamField({ label, unit, hint, min, max, step, digits = 0, value, def, onChange }: {
  label: string; unit?: string; hint: string; min: number; max: number; step: number; digits?: number;
  value: number; def?: number; onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const pct = ((clamp(value, min, max) - min) / (max - min)) * 100;
  const modified = def !== undefined && Math.abs(def - value) > 1e-9;
  const commit = (s: string) => {
    const v = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isNaN(v)) onChange(clamp(Math.round(v / step) * step, min, max));
    setDraft(null);
  };
  return (
    <div className="group py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
          <span className="truncate">{label}</span>
          <Hint text={hint}>
            <button tabIndex={-1} className="text-muted/70 hover:text-signal" aria-label={hint}><Icon name="info" size={13} /></button>
          </Hint>
          {modified && (
            <Hint text={`Réinitialiser (${num(def!, digits)})`}>
              <button onClick={() => onChange(def!)} aria-label="Réinitialiser" className="grid size-4 place-items-center rounded-full text-signal opacity-80 hover:opacity-100">
                <span className="size-1.5 rounded-full bg-signal" />
              </button>
            </Hint>
          )}
        </label>
        <div className="flex items-baseline rounded-lg bg-surface-2 px-2 ring-1 ring-transparent transition focus-within:bg-surface focus-within:ring-signal/60">
          <input
            aria-label={label}
            inputMode="decimal"
            className="tnum w-[74px] bg-transparent py-1 text-right font-mono text-[13px] font-medium text-ink outline-none"
            value={draft ?? num(value, digits)}
            onFocus={(e) => { setDraft(String(value)); requestAnimationFrame(() => e.target.select()); }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') { setDraft(null); (e.target as HTMLInputElement).blur(); }
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const k = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
                const v = clamp(+(value + k).toFixed(4), min, max);
                onChange(v); setDraft(String(v));
              }
            }}
          />
          {unit && <span className="ml-1 text-[11px] text-muted">{unit}</span>}
        </div>
      </div>
      <input type="range" className="slider" min={min} max={max} step={step} value={value} aria-label={label}
        style={{ ['--pct' as string]: `${pct}%` }} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
});

/* ───────── Chips (choix discrets) ───────── */
export function Chips<T extends string | number>({ label, hint, value, options, onChange, format = (v) => String(v) }: {
  label: string; hint?: string; value: T; options: readonly T[]; onChange: (v: T) => void; format?: (v: T) => ReactNode;
}) {
  return (
    <div className="py-2">
      <div className="mb-2 flex items-center gap-1.5 text-[13px] text-ink-2">
        {label}
        {hint && <Hint text={hint}><span className="text-muted/70"><Icon name="info" size={13} /></span></Hint>}
      </div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={String(o)} role="radio" aria-checked={o === value} onClick={() => onChange(o)}
            className={cx('tnum h-8 rounded-lg px-2.5 font-mono text-[12.5px] font-medium ring-1 transition-all active:scale-95',
              o === value ? 'bg-signal-soft text-signal ring-signal/50' : 'bg-surface-2 text-ink-2 ring-transparent hover:ring-line')}>
            {format(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── Nombre animé ───────── */
export function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const a = from.current;
    const d = 420;
    cancelAnimationFrame(raf.current);
    if (reduce || a === value) { from.current = value; setShown(value); return; }
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / d);
      const e = 1 - Math.pow(1 - k, 3);
      const v = a + (value - a) * e;
      from.current = v;
      setShown(v);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{format(shown)}</>;
}

/* ───────── Badge ───────── */
export function Badge({ tone = 'signal', children }: { tone?: 'signal' | 'iris' | 'amber' | 'rose' | 'muted'; children: ReactNode }) {
  const t = {
    signal: 'bg-signal-soft text-signal', iris: 'bg-iris-soft text-iris', amber: 'bg-amber-soft text-amber',
    rose: 'bg-rose-soft text-rose', muted: 'bg-surface-2 text-muted',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', t)}>{children}</span>;
}

/* ───────── Toasts ───────── */
interface ToastItem { id: number; text: string; action?: { label: string; run: () => void } }
const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let tid = 0;
export function toast(text: string, action?: ToastItem['action']) {
  const id = ++tid;
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, text, action }] }));
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), action ? 5000 : 2600);
}
export function Toasts() {
  const items = useToasts((s) => s.items);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 z-[2000] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-6">
      {items.map((t) => (
        <div key={t.id} className="toast pointer-events-auto flex items-center gap-3 rounded-xl bg-ink py-2.5 pr-2.5 pl-4 text-[13px] font-medium whitespace-nowrap text-bg shadow-2xl">
          <Icon name="check" size={15} className="text-signal" />
          {t.text}
          {t.action && (
            <button className="rounded-lg px-2 py-1 font-semibold text-signal hover:bg-white/10" onClick={() => {
              t.action!.run(); useToasts.setState((s) => ({ items: s.items.filter((x) => x.id !== t.id) }));
            }}>{t.action.label}</button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ───────── Bouton icône ───────── */
export function IconButton({ icon, label, onClick, active, className }: {
  icon: IconName; label: string; onClick?: () => void; active?: boolean; className?: string;
}) {
  return (
    <Hint text={label}>
      <button aria-label={label} aria-pressed={active} onClick={onClick}
        className={cx('grid size-9 place-items-center rounded-xl transition active:scale-95',
          active ? 'bg-signal-soft text-signal' : 'text-ink-2 hover:bg-surface-2 hover:text-ink', className)}>
        <Icon name={icon} size={17} />
      </button>
    </Hint>
  );
}
