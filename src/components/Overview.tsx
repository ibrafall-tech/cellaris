import type { ReactNode } from 'react';
import { useApp, useResults } from '../store/store';
import { compact, money, num, rate } from '../lib/format';
import { AnimatedNumber, Badge, Card, cx } from './ui';
import { Donut, HBars, Radar, Ring, Waterfall } from './charts';
import { Icon, type IconName } from './Icon';
import type { Params, Results } from '../engine/types';

function Stat({ label, value, unit, sub, tone }: { label: string; value: string; unit?: string; sub?: string; tone?: 'amber' | 'rose' }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[12px] text-muted">{label}</div>
      <div className={cx('tnum mt-0.5 truncate font-display text-[19px] font-semibold', tone === 'rose' ? 'text-rose' : tone === 'amber' ? 'text-amber' : 'text-ink')}>
        {value}{unit && <span className="ml-1 text-[12px] font-medium text-muted">{unit}</span>}
      </div>
      {sub && <div className="truncate text-[11.5px] text-muted">{sub}</div>}
    </div>
  );
}

function Hero({ r }: { r: Results }) {
  const isCap = r.limitingFactor === 'capacity';
  const loadTone = r.networkLoad >= 85 ? 'rose' : r.networkLoad >= 70 ? 'amber' : undefined;
  return (
    <section className="rise relative overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-signal opacity-[0.10] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-iris opacity-[0.10] blur-3xl" />
      <div className="relative grid gap-6 p-6 @3xl:grid-cols-[1.1fr_1fr] @3xl:p-7">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold tracking-[0.14em] text-muted uppercase">Résultat du dimensionnement</span>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <span className="tnum font-display text-[56px] leading-none font-semibold tracking-tight text-ink @3xl:text-[68px]">
              <AnimatedNumber value={r.finalSites} format={(v) => num(Math.round(v))} />
            </span>
            <span className="mb-2 text-[15px] font-medium text-ink-2">sites eNodeB</span>
          </div>
          <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-2">
            Le réseau est <b className={isCap ? 'text-amber' : 'text-iris'}>limité par la {isCap ? 'capacité' : 'couverture'}</b> :{' '}
            {isCap
              ? `il faut ${num(r.capacity.sitesRequired)} sites pour écouler le trafic, contre ${num(r.coverage.sitesRequired)} pour couvrir la zone.`
              : `il faut ${num(r.coverage.sitesRequired)} sites pour couvrir la zone, contre ${num(r.capacity.sitesRequired)} pour écouler le trafic.`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 self-center rounded-2xl bg-surface-2/70 p-5">
          <Stat label="Sites · couverture" value={num(r.coverage.sitesRequired)} sub={`Rayon ${num(r.propagation.cellRadius, 2)} km`} />
          <Stat label="Sites · capacité" value={num(r.capacity.sitesRequired)} sub={`${num(r.capacity.siteThroughput, 0)} Mbps / site`} />
          <Stat label="Charge réseau" value={num(r.networkLoad, 1)} unit="%" tone={loadTone} sub="Seuils : 70 % / 85 %" />
          <Stat label="Score QoS" value={num(r.kpis.qosScore, 1)} unit="/100" sub={r.kpis.qosScore >= 70 ? 'Bon' : r.kpis.qosScore >= 50 ? 'Moyen' : 'Faible'} />
        </div>
      </div>
    </section>
  );
}

function Row({ k, v, strong }: { k: ReactNode; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2 text-[13px] last:border-0">
      <span className="text-muted">{k}</span>
      <span className={cx('tnum font-mono', strong ? 'font-semibold text-ink' : 'text-ink-2')}>{v}</span>
    </div>
  );
}

function Advice({ r, p }: { r: Results; p: Params }) {
  const items: { icon: IconName; tone: 'rose' | 'amber' | 'signal' | 'iris'; title: string; text: string }[] = [];
  if (r.networkLoad > 85) items.push({ icon: 'alert', tone: 'rose', title: 'Charge élevée', text: 'La charge dépasse 85 %. Ajoutez des sites ou élargissez la bande passante.' });
  else if (r.networkLoad > 70) items.push({ icon: 'gauge', tone: 'amber', title: 'Charge modérée', text: 'La charge approche le seuil critique. Surveillez l’évolution du trafic.' });
  else items.push({ icon: 'check', tone: 'signal', title: 'Configuration équilibrée', text: 'Le dimensionnement dispose d’une marge de capacité suffisante.' });
  if (r.limitingFactor === 'coverage') {
    items.push({ icon: 'radio', tone: 'iris', title: 'Limité par la couverture', text: `Pour réduire le nombre de sites : bande plus basse (actuellement ${p.radio.frequencyBand} MHz) ou antennes plus hautes (${p.enodeb.antennaHeight} m).` });
  } else {
    items.push({ icon: 'zap', tone: 'amber', title: 'Limité par la capacité', text: `Pour réduire le nombre de sites : MIMO supérieur (actuellement ${p.enodeb.mimoConfig.replace('x', '×')}) ou bande passante plus large (${p.radio.bandwidth} MHz).` });
  }
  const tone = { rose: 'bg-rose-soft text-rose', amber: 'bg-amber-soft text-amber', signal: 'bg-signal-soft text-signal', iris: 'bg-iris-soft text-iris' };
  return (
    <div className="flex flex-col gap-3">
      {items.map((i) => (
        <div key={i.title} className="flex gap-3 rounded-xl bg-surface-2/60 p-3">
          <span className={cx('grid size-8 shrink-0 place-items-center rounded-lg', tone[i.tone])}><Icon name={i.icon} size={16} /></span>
          <div>
            <div className="text-[13px] font-semibold text-ink">{i.title}</div>
            <div className="text-[12.5px] leading-relaxed text-ink-2">{i.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Overview() {
  const r = useResults();
  const p = useApp((s) => s.params);
  const currency = useApp((s) => s.currency);
  const lb = r.linkBudget;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <Hero r={r} />

      <div className="grid gap-4 @5xl:grid-cols-[1.45fr_1fr]">
        <Card title="Bilan de liaison" icon="zap" aside={<Badge tone="iris">MAPL {num(lb.mapl, 1)} dB</Badge>}>
          <Waterfall steps={[
            { label: 'P_TX', value: lb.txPower, kind: 'total' },
            { label: 'G_TX', value: lb.txGain, kind: 'gain' },
            { label: 'G_RX', value: lb.rxGain, kind: lb.rxGain >= 0 ? 'gain' : 'loss' },
            { label: 'Pertes', value: -lb.totalLosses, kind: 'loss' },
            { label: 'Fading', value: -p.radio.fadingMargin, kind: 'loss' },
            { label: 'Interf.', value: -p.radio.interferenceMargin, kind: 'loss' },
            { label: '−S_RX', value: -lb.sensitivity, kind: 'gain' },
            { label: 'MAPL', value: lb.mapl, kind: 'total' },
          ]} />
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-4">
            <Stat label="EIRP" value={num(lb.eirp, 1)} unit="dBm" />
            <Stat label="Pertes totales" value={num(lb.totalLosses, 1)} unit="dB" />
            <Stat label="Path loss @ R" value={num(r.propagation.pathLoss, 1)} unit="dB" />
          </div>
        </Card>

        <Card title="Couverture vs capacité" icon="target">
          <HBars items={[
            { label: 'Couverture', value: r.coverage.sitesRequired, color: 'var(--iris)' },
            { label: 'Capacité', value: r.capacity.sitesRequired, color: 'var(--amber)' },
            { label: 'Final', note: '= max', value: r.finalSites, color: 'var(--signal)' },
          ]} />
          <div className="mt-5 grid grid-cols-2 gap-x-5 border-t border-line pt-2">
            <div>
              <Row k="Rayon cellule" v={`${num(r.coverage.cellRadius, 2)} km`} strong />
              <Row k="Surface / cellule" v={`${num(r.coverage.cellArea, 2)} km²`} />
              <Row k="Couverture" v={`${num(r.coverage.coveragePercentage, 1)} %`} />
            </div>
            <div>
              <Row k="Utilisateurs" v={compact(r.capacity.totalUsers)} strong />
              <Row k="PRB" v={num(r.capacity.prbCount)} />
              <Row k="Demande" v={rate(r.capacity.totalTrafficDemand)} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
        <Card title="Indicateurs clés" icon="gauge">
          <div className="grid grid-cols-2 gap-4 py-1">
            <Ring value={r.kpis.coverageEfficiency} label="Couverture" color="var(--iris)" />
            <Ring value={r.kpis.capacityEfficiency} label="Marge capacité" color="var(--amber)" />
            <Ring value={r.kpis.qosScore} label="Score QoS" />
            <Ring value={r.networkLoad} label="Charge réseau" color={r.networkLoad >= 85 ? 'var(--rose)' : r.networkLoad >= 70 ? 'var(--amber)' : 'var(--signal)'} />
          </div>
        </Card>

        <Card title="Coûts sur 5 ans" icon="coins">
          <Donut center={money(r.cost.totalCost5Years, currency)} sub="coût total"
            parts={[{ value: r.cost.totalCapex, color: 'var(--signal)' }, { value: r.cost.totalOpex5Years, color: 'var(--iris)' }]} />
          <div className="mt-4">
            <Row k={<><i className="mr-2 inline-block size-2 rounded-full bg-signal" />CAPEX</>} v={money(r.cost.totalCapex, currency)} strong />
            <Row k={<><i className="mr-2 inline-block size-2 rounded-full bg-iris" />OPEX (5 ans)</>} v={money(r.cost.totalOpex5Years, currency)} strong />
            <Row k="Coût / abonné" v={money(r.cost.costPerUser, currency, false)} />
            <Row k="Coût / km²" v={money(r.cost.costPerKm2, currency)} />
          </div>
        </Card>

        <Card title="Profil du réseau" icon="spark" className="@2xl:col-span-2 @5xl:col-span-1">
          <Radar axes={[
            { label: 'Couverture', value: r.kpis.coverageEfficiency },
            { label: 'Capacité', value: r.kpis.capacityEfficiency },
            { label: 'QoS', value: r.kpis.qosScore },
            { label: 'Eff. spectrale', value: (r.kpis.spectralEfficiencyTotal / 6) * 100 },
            { label: 'Marge', value: Math.max(0, 100 - r.networkLoad) },
          ]} />
        </Card>
      </div>

      <div className="grid gap-4 @4xl:grid-cols-[1fr_1.2fr]">
        <Card title="Recommandations" icon="wand"><Advice r={r} p={p} /></Card>
        <Card title="Capacité radio" icon="radio">
          <div className="grid gap-x-6 @lg:grid-cols-2">
            <div>
              <Row k="Efficacité spectrale" v={`${num(r.capacity.spectralEfficiency, 1)} bit/s/Hz`} />
              <Row k="Débit / cellule" v={`${num(r.capacity.cellThroughput, 1)} Mbps`} strong />
              <Row k="Débit / site" v={`${num(r.capacity.siteThroughput, 1)} Mbps`} strong />
            </div>
            <div>
              <Row k="Trafic total" v={rate(r.capacity.totalTrafficDemand)} />
              <Row k="Charge / site" v={`${num(r.capacity.loadPerSite, 1)} %`} />
              <Row k="Utilisation cible" v="70 %" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
