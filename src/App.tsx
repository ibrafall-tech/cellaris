import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { decodeShare, encodeShare, isParams, useApp, useResults, type Tab, type Theme } from './store/store';
import { ParamsPanel } from './components/ParamsPanel';
import { Overview } from './components/Overview';
import { Analysis } from './components/Analysis';
import { Formulas } from './components/Formulas';
import { Icon, type IconName } from './components/Icon';
import { Hint, Toasts, cx, toast } from './components/ui';
import { num, type Currency } from './lib/format';
import { ENV_LABEL } from './engine/constants';

const MapView = lazy(() => import('./components/MapView'));

const TABS: { id: Tab; label: string; icon: IconName; key: string }[] = [
  { id: 'overview', label: 'Synthèse', icon: 'grid', key: '1' },
  { id: 'map', label: 'Carte', icon: 'map', key: '2' },
  { id: 'analysis', label: 'Analyses', icon: 'chart', key: '3' },
  { id: 'formulas', label: 'Formules', icon: 'sigma', key: '4' },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden>
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--signal)" /><stop offset="1" stopColor="var(--iris)" /></linearGradient></defs>
        <rect width="64" height="64" rx="17" fill="var(--ink)" />
        <path d="M32 12 49.3 22v20L32 52 14.7 42V22Z" fill="none" stroke="url(#lg)" strokeWidth="4.5" strokeLinejoin="round" />
        <circle cx="32" cy="32" r="6.5" fill="url(#lg)" />
      </svg>
      <div className="leading-none">
        <div className="font-display text-[17px] font-bold tracking-tight text-ink">Cellaris</div>
        <div className="mt-0.5 text-[10.5px] font-medium tracking-wide text-muted">LTE Network Planner</div>
      </div>
    </div>
  );
}

function useThemeEffect(theme: Theme) {
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

function Menu({ onClose, anchor }: { onClose: () => void; anchor: React.RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const r = useResults();
  const { params, currency, loadParams } = useApp(useShallow((s) => ({ params: s.params, currency: s.currency, loadParams: s.loadParams })));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !anchor.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('button')?.focus();
    return () => { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [onClose, anchor]);

  const pdf = async () => {
    setBusy(true);
    try { const { generatePdf } = await import('./lib/report'); await generatePdf(params, r, currency); toast('Rapport PDF téléchargé'); }
    finally { setBusy(false); onClose(); }
  };
  const json = () => {
    const blob = new Blob([JSON.stringify({ app: 'Cellaris', version: 1, author: 'Ibrahima FALL', date: new Date().toISOString(), params, results: r }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cellaris-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Projet exporté en JSON');
    onClose();
  };
  const share = async () => {
    const url = `${location.origin}${location.pathname}#s=${encodeShare(params)}`;
    try { await navigator.clipboard.writeText(url); toast('Lien de partage copié'); } catch { prompt('Copiez ce lien :', url); }
    onClose();
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const p = data.params ?? data;
      if (!isParams(p)) throw new Error();
      const prev = params;
      loadParams(p);
      toast('Projet importé', { label: 'Annuler', run: () => loadParams(prev) });
    } catch { toast('Fichier invalide'); }
    onClose();
  };

  const Item = ({ icon, label, sub, onClick }: { icon: IconName; label: string; sub: string; onClick: () => void }) => (
    <button onClick={onClick} disabled={busy}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2 focus:bg-surface-2 focus:outline-none disabled:opacity-50">
      <span className="grid size-8 place-items-center rounded-lg bg-surface-2 text-signal"><Icon name={icon} size={16} /></span>
      <span><span className="block text-[13px] font-semibold text-ink">{label}</span><span className="block text-[11.5px] text-muted">{sub}</span></span>
    </button>
  );

  return (
    <div ref={ref} role="menu" className="rise absolute top-full right-0 z-[1100] mt-2 w-72 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl">
      <Item icon="file" label={busy ? 'Génération…' : 'Rapport PDF'} sub="Document complet et mis en forme" onClick={pdf} />
      <Item icon="download" label="Exporter le projet" sub="Paramètres + résultats (JSON)" onClick={json} />
      <Item icon="upload" label="Importer un projet" sub="Recharger un fichier JSON" onClick={() => fileRef.current?.click()} />
      <Item icon="link" label="Copier le lien de partage" sub="Le scénario tient dans l’URL" onClick={share} />
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}

export default function App() {
  const { tab, setTab, theme, setTheme, currency, setCurrency, env, loadParams } = useApp(useShallow((s) => ({
    tab: s.tab, setTab: s.setTab, theme: s.theme, setTheme: s.setTheme, currency: s.currency, setCurrency: s.setCurrency,
    env: s.params.zone.environment, loadParams: s.loadParams,
  })));
  const r = useResults();
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  useThemeEffect(theme);

  // Lien de partage
  useEffect(() => {
    const m = location.hash.match(/^#s=(.+)$/);
    if (!m) return;
    const p = decodeShare(m[1]);
    history.replaceState(null, '', location.pathname);
    if (p) { loadParams(p); toast('Scénario partagé chargé'); }
  }, [loadParams]);

  // Raccourcis clavier 1–4
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || t.closest('input,textarea,select,[contenteditable]')) return;
      const found = TABS.find((x) => x.key === e.key);
      if (found) setTab(found.id);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [setTab]);

  useEffect(() => { document.body.style.overflow = sheet ? 'hidden' : ''; }, [sheet]);

  const nextTheme: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
  const themeIcon: Record<Theme, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };
  const themeLabel: Record<Theme, string> = { system: 'Thème : système', light: 'Thème : clair', dark: 'Thème : sombre' };

  return (
    <div className="flex h-full flex-col">
      {/* En-tête */}
      <header className="sticky top-0 z-[1000] border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="flex h-15 items-center gap-3 px-4 lg:px-5">
          <Logo />
          <nav className="mx-auto hidden items-center gap-1 rounded-2xl bg-surface-2 p-1 md:flex" aria-label="Sections">
            {TABS.map((t) => (
              <Hint key={t.id} text={`Raccourci : ${t.key}`}>
                <button onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
                  className={cx('flex h-8.5 items-center gap-2 rounded-xl px-3.5 text-[13px] font-medium transition',
                    tab === t.id ? 'bg-surface text-ink shadow-card ring-1 ring-line' : 'text-muted hover:text-ink')}>
                  <Icon name={t.icon} size={15} className={tab === t.id ? 'text-signal' : ''} />{t.label}
                </button>
              </Hint>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <div className="tnum mr-1 hidden items-center gap-2 rounded-xl bg-surface-2 px-3 py-1.5 font-mono text-[12px] xl:flex">
              <span className="text-muted">{ENV_LABEL[env]}</span>
              <span className="h-3 w-px bg-line" />
              <span className="font-semibold text-ink">{num(r.finalSites)} sites</span>
            </div>
            <label className="sr-only" htmlFor="cur">Devise</label>
            <select id="cur" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}
              className="h-9 cursor-pointer rounded-xl bg-surface-2 px-2.5 text-[12.5px] font-semibold text-ink-2 outline-none hover:text-ink">
              <option value="USD">USD $</option><option value="EUR">EUR €</option><option value="XOF">FCFA</option>
            </select>
            <Hint text={themeLabel[theme]}>
              <button aria-label={themeLabel[theme]} onClick={() => setTheme(nextTheme[theme])}
                className="grid size-9 place-items-center rounded-xl text-ink-2 transition hover:bg-surface-2 hover:text-ink active:scale-95">
                <Icon name={themeIcon[theme]} size={17} />
              </button>
            </Hint>
            <div className="relative">
              <button ref={menuBtn} onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu}
                className="flex h-9 items-center gap-2 rounded-xl bg-ink px-3.5 text-[13px] font-semibold text-bg transition hover:opacity-90 active:scale-[.97]">
                <Icon name="share" size={15} /><span className="hidden sm:inline">Exporter</span>
              </button>
              {menu && <Menu onClose={() => setMenu(false)} anchor={menuBtn} />}
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Panneau latéral (desktop) */}
        <aside className="hidden w-[372px] shrink-0 flex-col border-r border-line lg:flex">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5"><ParamsPanel /></div>
          <footer className="flex items-center justify-between border-t border-line px-5 py-3 text-[11.5px] text-muted">
            <span>Conçu par <b className="font-semibold text-ink-2">Ibrahima FALL</b></span>
            <span className="tnum font-mono">v1.0</span>
          </footer>
        </aside>

        {/* Contenu */}
        <main className={cx('min-w-0 flex-1 overflow-y-auto pb-[calc(84px+env(safe-area-inset-bottom))] lg:pb-6', tab === 'map' ? 'p-3 lg:p-4' : 'px-3 py-4 sm:px-5 lg:px-6 lg:py-6')}>
          <div key={tab} className={cx('rise @container', tab === 'map' && 'h-[calc(100dvh-60px-84px-24px)] lg:h-full')}>
            {tab === 'overview' && <Overview />}
            {tab === 'map' && (
              <Suspense fallback={<div className="grid h-full place-items-center rounded-3xl border border-line bg-surface text-[13px] text-muted">Chargement de la carte…</div>}>
                <MapView />
              </Suspense>
            )}
            {tab === 'analysis' && <Analysis />}
            {tab === 'formulas' && <Formulas />}
          </div>
        </main>
      </div>

      {/* Navigation mobile */}
      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-[68px] max-w-lg grid-cols-5 px-2">
          <button onClick={() => setSheet(true)} className="flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold text-signal">
            <span className="grid h-7 w-12 place-items-center rounded-full bg-signal-soft"><Icon name="sliders" size={18} /></span>Réglages
          </button>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={cx('flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition', tab === t.id ? 'text-ink' : 'text-muted')}>
              <span className={cx('grid h-7 w-12 place-items-center rounded-full transition', tab === t.id && 'bg-surface-3')}><Icon name={t.icon} size={18} /></span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Feuille de réglages (mobile) */}
      <div className={cx('fixed inset-0 z-[1500] lg:hidden', sheet ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!sheet}>
        <div onClick={() => setSheet(false)} className={cx('absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300', sheet ? 'opacity-100' : 'opacity-0')} />
        <div role="dialog" aria-modal="true" aria-label="Paramètres"
          className={cx('absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl border-t border-line bg-bg shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]', sheet ? 'translate-y-0' : 'translate-y-full')}>
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <span className="mx-auto mb-1 h-1 w-10 rounded-full bg-surface-3" />
          </div>
          <div className="flex items-center justify-between px-5 pb-2">
            <h2 className="font-display text-[17px] font-semibold">Paramètres</h2>
            <div className="tnum flex items-center gap-2">
              <span className="rounded-lg bg-signal-soft px-2.5 py-1 font-mono text-[12px] font-semibold text-signal">{num(r.finalSites)} sites</span>
              <button aria-label="Fermer" onClick={() => setSheet(false)} className="grid size-9 place-items-center rounded-xl bg-surface-2"><Icon name="x" size={16} /></button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(16px+env(safe-area-inset-bottom))]"><ParamsPanel /></div>
        </div>
      </div>

      <Toasts />
    </div>
  );
}
