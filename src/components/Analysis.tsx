import { useMemo, useState } from 'react';
import { useApp, useResults } from '../store/store';
import { compute, sweep } from '../engine/compute';
import { BANDWIDTHS, ENV_LABEL, FREQUENCY_BANDS, PRESETS } from '../engine/constants';
import type { Environment, Params } from '../engine/types';
import { compact, money, num } from '../lib/format';
import { Card, Segmented, cx } from './ui';
import { Legend, LineChart } from './charts';

type SweepKey = 'height' | 'band' | 'bandwidth' | 'traffic' | 'penetration' | 'power';

const SWEEPS: Record<SweepKey, {
  label: string; unit: string; values: number[]; current: (p: Params) => number; apply: (p: Params, v: number) => Params;
}> = {
  height: {
    label: 'Hauteur antenne', unit: 'm', values: Array.from({ length: 15 }, (_, i) => 10 + i * 5),
    current: (p) => p.enodeb.antennaHeight, apply: (p, v) => ({ ...p, enodeb: { ...p.enodeb, antennaHeight: v } }),
  },
  band: {
    label: 'Bande', unit: 'MHz', values: [...FREQUENCY_BANDS],
    current: (p) => p.radio.frequencyBand, apply: (p, v) => ({ ...p, radio: { ...p.radio, frequencyBand: v } }),
  },
  bandwidth: {
    label: 'Largeur de bande', unit: 'MHz', values: [...BANDWIDTHS],
    current: (p) => p.radio.bandwidth, apply: (p, v) => ({ ...p, radio: { ...p.radio, bandwidth: v } }),
  },
  traffic: {
    label: 'Trafic / utilisateur', unit: 'Mo/h', values: Array.from({ length: 20 }, (_, i) => 50 + i * 50),
    current: (p) => p.ue.trafficPerUser, apply: (p, v) => ({ ...p, ue: { ...p.ue, trafficPerUser: v } }),
  },
  penetration: {
    label: 'Pénétration', unit: '%', values: Array.from({ length: 19 }, (_, i) => 10 + i * 5),
    current: (p) => p.zone.penetrationRate, apply: (p, v) => ({ ...p, zone: { ...p.zone, penetrationRate: v } }),
  },
  power: {
    label: 'Puissance Tx', unit: 'dBm', values: Array.from({ length: 21 }, (_, i) => 30 + i),
    current: (p) => p.radio.txPower, apply: (p, v) => ({ ...p, radio: { ...p.radio, txPower: v } }),
  },
};

export function Analysis() {
  const p = useApp((s) => s.params);
  const currency = useApp((s) => s.currency);
  const loadParams = useApp((s) => s.loadParams);
  const r = useResults();
  const [key, setKey] = useState<SweepKey>('height');
  const sw = SWEEPS[key];
  const data = useMemo(() => sweep(p, sw.apply, sw.values), [p, sw]);
  const envs = useMemo(() => (Object.keys(PRESETS) as Environment[]).map((e) => ({ e, r: compute(PRESETS[e]) })), []);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <Card title="Analyse de sensibilité" icon="chart"
        aside={<Legend items={[{ label: 'Final', color: 'var(--signal)' }, { label: 'Couverture', color: 'var(--iris)', dashed: true }, { label: 'Capacité', color: 'var(--amber)', dashed: true }]} />}>
        <p className="mb-4 text-[13px] text-ink-2">Nombre de sites requis lorsqu’un seul paramètre varie, tous les autres restant fixes.</p>
        <div className="-mx-1 mb-4 overflow-x-auto px-1 pb-1">
          <div className="flex w-max gap-1.5">
            {(Object.keys(SWEEPS) as SweepKey[]).map((k) => (
              <button key={k} onClick={() => setKey(k)} aria-pressed={k === key}
                className={cx('h-8 rounded-lg px-3 text-[12.5px] font-medium ring-1 transition whitespace-nowrap',
                  k === key ? 'bg-signal-soft text-signal ring-signal/50' : 'bg-surface-2 text-ink-2 ring-transparent hover:ring-line')}>
                {SWEEPS[k].label}
              </button>
            ))}
          </div>
        </div>
        <LineChart data={data} xLabel={`${sw.label} (${sw.unit})`} current={sw.current(p)} xFormat={(v) => num(v, v % 1 ? 1 : 0)} />
      </Card>

      <Card title="Comparaison des environnements (préréglages)" icon="layers" pad={false}>
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] tracking-wide text-muted uppercase">
                <th className="py-3 pr-3 font-semibold">Indicateur</th>
                {envs.map(({ e }) => (
                  <th key={e} className="px-3 py-3 text-right font-semibold">
                    <span className={cx(p.zone.environment === e && 'text-signal')}>{ENV_LABEL[e]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tnum font-mono">
              {([
                ['Rayon cellule', (x) => `${num(x.propagation.cellRadius, 2)} km`],
                ['MAPL', (x) => `${num(x.linkBudget.mapl, 1)} dB`],
                ['Sites couverture', (x) => num(x.coverage.sitesRequired)],
                ['Sites capacité', (x) => num(x.capacity.sitesRequired)],
                ['Sites finaux', (x) => num(x.finalSites)],
                ['Facteur limitant', (x) => (x.limitingFactor === 'coverage' ? 'Couverture' : 'Capacité')],
                ['Utilisateurs', (x) => compact(x.capacity.totalUsers)],
                ['Coût 5 ans', (x) => money(x.cost.totalCost5Years, currency)],
                ['Score QoS', (x) => num(x.kpis.qosScore, 1)],
              ] as [string, (x: ReturnType<typeof compute>) => string][]).map(([label, f]) => (
                <tr key={label} className="border-t border-line/70">
                  <td className="py-2.5 pr-3 font-sans text-ink-2">{label}</td>
                  {envs.map(({ e, r: x }) => (
                    <td key={e} className={cx('px-3 py-2.5 text-right', label === 'Sites finaux' ? 'font-semibold text-ink' : 'text-ink-2')}>{f(x)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted">Charger un préréglage :</span>
            <Segmented size="sm" className="w-[280px]" label="Charger un préréglage" value={p.zone.environment}
              onChange={(e) => loadParams(structuredClone(PRESETS[e]))}
              options={(['urban', 'suburban', 'rural'] as const).map((e) => ({ value: e, label: ENV_LABEL[e] }))} />
          </div>
        </div>
      </Card>

      <Card title="Propagation COST-231 Hata" icon="radio">
        <div className="grid gap-x-8 gap-y-1 @lg:grid-cols-2 @4xl:grid-cols-3">
          {[
            ['a(h_m)', `${num(r.propagation.ahm, 3)} dB`],
            ['Constante A', `${num(r.propagation.A, 2)} dB`],
            ['Pente B', `${num(r.propagation.B, 2)} dB/déc.`],
            ['Correction C_m', `${r.propagation.correctionFactor > 0 ? '+' : ''}${r.propagation.correctionFactor} dB`],
            ['Rayon R', `${num(r.propagation.cellRadius, 3)} km`],
            ['Surface / site', `${num(r.coverage.siteArea, 2)} km²`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between border-b border-line/60 py-2 text-[13px]">
              <span className="text-muted">{k}</span><span className="tnum font-mono text-ink">{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
