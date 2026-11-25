import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import { compute } from '../engine/compute';
import { PRESETS } from '../engine/constants';
import type { EnodebParams, Environment, Params, RadioParams, UEParams, ZoneParams } from '../engine/types';
import type { Currency } from '../lib/format';

export type Tab = 'overview' | 'map' | 'analysis' | 'formulas';
export type Theme = 'system' | 'light' | 'dark';
export type BaseLayer = 'osm' | 'topo' | 'satellite';

export interface Site {
  id: string;
  name: string;
  lat: number;
  lng: number;
  enabled: boolean;
  azimuth: number;
}

interface State {
  params: Params;
  sites: Site[];
  tab: Tab;
  theme: Theme;
  currency: Currency;
  baseLayer: BaseLayer;
  showCoverage: boolean;
  showSectors: boolean;
  mapCenter: [number, number];
  setZone: (z: Partial<ZoneParams>) => void;
  setRadio: (r: Partial<RadioParams>) => void;
  setEnodeb: (e: Partial<EnodebParams>) => void;
  setUE: (u: Partial<UEParams>) => void;
  setEnvironment: (env: Environment) => void;
  loadParams: (p: Params) => void;
  setTab: (t: Tab) => void;
  setTheme: (t: Theme) => void;
  setCurrency: (c: Currency) => void;
  setBaseLayer: (b: BaseLayer) => void;
  toggleCoverage: () => void;
  toggleSectors: () => void;
  addSite: (lat: number, lng: number) => Site;
  addSites: (pts: { lat: number; lng: number }[]) => void;
  updateSite: (id: string, patch: Partial<Site>) => void;
  removeSite: (id: string) => void;
  restoreSites: (sites: Site[]) => void;
  clearSites: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const DAKAR: [number, number] = [14.6937, -17.4441];

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      params: PRESETS.urban,
      sites: [],
      tab: 'overview',
      theme: 'system',
      currency: 'USD',
      baseLayer: 'osm',
      showCoverage: true,
      showSectors: true,
      mapCenter: DAKAR,
      setZone: (z) => set((s) => ({ params: { ...s.params, zone: { ...s.params.zone, ...z } } })),
      setRadio: (r) => set((s) => ({ params: { ...s.params, radio: { ...s.params.radio, ...r } } })),
      setEnodeb: (e) => set((s) => ({ params: { ...s.params, enodeb: { ...s.params.enodeb, ...e } } })),
      setUE: (u) => set((s) => ({ params: { ...s.params, ue: { ...s.params.ue, ...u } } })),
      setEnvironment: (env) => set({ params: structuredClone(PRESETS[env]) }),
      loadParams: (p) => set({ params: p }),
      setTab: (tab) => set({ tab }),
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
      setBaseLayer: (baseLayer) => set({ baseLayer }),
      toggleCoverage: () => set((s) => ({ showCoverage: !s.showCoverage })),
      toggleSectors: () => set((s) => ({ showSectors: !s.showSectors })),
      addSite: (lat, lng) => {
        const n = get().sites.length + 1;
        const site: Site = { id: uid(), name: `Site ${String(n).padStart(2, '0')}`, lat, lng, enabled: true, azimuth: 0 };
        set((s) => ({ sites: [...s.sites, site] }));
        return site;
      },
      addSites: (pts) =>
        set((s) => {
          const start = s.sites.length;
          const added = pts.map((p, i) => ({
            id: uid(), name: `Site ${String(start + i + 1).padStart(2, '0')}`, lat: p.lat, lng: p.lng, enabled: true, azimuth: 0,
          }));
          return { sites: [...s.sites, ...added] };
        }),
      updateSite: (id, patch) => set((s) => ({ sites: s.sites.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeSite: (id) => set((s) => ({ sites: s.sites.filter((x) => x.id !== id) })),
      restoreSites: (sites) => set({ sites }),
      clearSites: () => set({ sites: [] }),
    }),
    {
      name: 'cellaris',
      version: 2,
      migrate: (st) => ({ ...(st as object), baseLayer: 'osm' }) as never,
      partialize: (s) => ({
        params: s.params, sites: s.sites, tab: s.tab, theme: s.theme, currency: s.currency,
        baseLayer: s.baseLayer, showCoverage: s.showCoverage, showSectors: s.showSectors,
      }),
    },
  ),
);

export function useResults() {
  const params = useApp((s) => s.params);
  return useMemo(() => compute(params), [params]);
}

/* ───────── Partage par lien ───────── */
export function encodeShare(p: Params) {
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShare(s: string): Params | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    return isParams(p) ? p : null;
  } catch {
    return null;
  }
}

export function isParams(p: unknown): p is Params {
  const o = p as Params;
  return (
    !!o && typeof o === 'object' &&
    typeof o.zone?.surface === 'number' && typeof o.radio?.txPower === 'number' &&
    typeof o.enodeb?.antennaHeight === 'number' && typeof o.ue?.sensitivity === 'number' &&
    ['urban', 'suburban', 'rural'].includes(o.zone.environment)
  );
}
