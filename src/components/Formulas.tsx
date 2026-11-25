import { useApp, useResults } from '../store/store';
import { num, rate } from '../lib/format';
import { Card } from './ui';

function F({ n, title, formula, text, vars }: { n: number; title: string; formula: string; text: string; vars: [string, string][] }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="tnum grid size-7 shrink-0 place-items-center rounded-lg bg-signal-soft font-mono text-[12px] font-semibold text-signal">{n}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{text}</p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface-2 px-4 py-3 font-mono text-[13px] leading-relaxed break-words text-ink">{formula}</div>
      <dl className="mt-3 grid gap-x-6 @lg:grid-cols-2">
        {vars.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line/60 py-1.5 text-[12.5px]">
            <dt className="font-mono text-muted">{k}</dt><dd className="tnum font-mono text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function Formulas() {
  const p = useApp((s) => s.params);
  const r = useResults();
  const { radio: ra, enodeb: en, ue, zone } = p;
  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-4">
      <div className="px-1">
        <h2 className="font-display text-[22px] font-semibold text-ink">Formules de dimensionnement</h2>
        <p className="mt-1 text-[13.5px] text-ink-2">Référence complète des équations utilisées, évaluées en direct avec vos paramètres.</p>
      </div>
      <F n={1} title="Bilan de liaison (MAPL)" formula="MAPL = P_TX + G_TX + G_RX − L_câble − L_corps − L_feeder − M_fading − M_interf − S_RX"
        text="Perte de propagation maximale admissible pour maintenir la liaison radio descendante."
        vars={[['P_TX', `${ra.txPower} dBm`], ['G_TX', `${num(ra.antennaGainTx, 1)} dBi`], ['G_RX', `${ue.antennaGain} dBi`], ['Σ pertes', `${num(r.linkBudget.totalLosses, 1)} dB`],
          ['M_fading + M_interf', `${num(ra.fadingMargin + ra.interferenceMargin, 1)} dB`], ['S_RX', `${ue.sensitivity} dBm`], ['EIRP', `${num(r.linkBudget.eirp, 1)} dBm`], ['MAPL', `${num(r.linkBudget.mapl, 1)} dB`]]} />
      <F n={2} title="Modèle COST-231 Hata" formula="PL = 46,3 + 33,9·log(f) − 13,82·log(h_b) − a(h_m) + (44,9 − 6,55·log(h_b))·log(d) + C_m"
        text="Modèle empirique de propagation valable de 1500 à 2000 MHz (extrapolé ici aux autres bandes), avec a(h_m) = (1,1·log f − 0,7)·h_m − (1,56·log f − 0,8)."
        vars={[['f', `${ra.frequencyBand} MHz`], ['h_b', `${en.antennaHeight} m`], ['h_m', `${num(ue.height, 1)} m`], ['a(h_m)', `${num(r.propagation.ahm, 3)} dB`],
          ['C_m', `${r.propagation.correctionFactor} dB`], ['PL(R)', `${num(r.propagation.pathLoss, 1)} dB`]]} />
      <F n={3} title="Rayon de cellule" formula="R = 10^((MAPL − A) / B)   avec  0,1 ≤ R ≤ 50 km"
        text="Inversion du modèle de propagation : A et B sont les constantes du modèle COST-231 pour la configuration courante."
        vars={[['A', `${num(r.propagation.A, 2)} dB`], ['B', `${num(r.propagation.B, 2)} dB`], ['R', `${num(r.propagation.cellRadius, 3)} km`]]} />
      <F n={4} title="Sites requis (couverture)" formula="N_couv = ⌈ S_zone / ((N_sect / 3) · k · R²) ⌉,   k = 2,6 (tri-sectoriel)  ou  π (omni)"
        text="Surface couverte par un site hexagonal, puis nombre de sites nécessaires pour couvrir toute la zone."
        vars={[['S_zone', `${num(zone.surface)} km²`], ['Surface / cellule', `${num(r.coverage.cellArea, 2)} km²`], ['Surface / site', `${num(r.coverage.siteArea, 2)} km²`], ['N_couv', num(r.coverage.sitesRequired)]]} />
      <F n={5} title="Débit par cellule" formula="C_cell = N_PRB × η × 180 kHz × (1 − 25 %)"
        text="Capacité utile d'une cellule : PRB disponibles, efficacité spectrale MIMO et overhead des canaux de contrôle."
        vars={[['N_PRB', num(r.capacity.prbCount)], ['η (MIMO ' + en.mimoConfig.replace('x', '×') + ')', `${r.capacity.spectralEfficiency} bit/s/Hz`], ['C_cell', `${num(r.capacity.cellThroughput, 1)} Mbps`], ['C_site', `${num(r.capacity.siteThroughput, 1)} Mbps`]]} />
      <F n={6} title="Trafic total & sites requis (capacité)" formula="T = N_users × T_user × 8 / 3600   ;   N_cap = ⌈ T / (0,7 × C_site) ⌉"
        text="Demande en heure chargée convertie en Mbps, puis nombre de sites pour une utilisation cible de 70 %."
        vars={[['N_users', num(r.capacity.totalUsers)], ['T_user', `${ue.trafficPerUser} Mo/h`], ['T', rate(r.capacity.totalTrafficDemand)], ['N_cap', num(r.capacity.sitesRequired)]]} />
      <F n={7} title="Dimensionnement final" formula="N_sites = max(N_couv, N_cap)"
        text="Le nombre final de sites garantit à la fois la couverture et la capacité."
        vars={[['N_couv', num(r.coverage.sitesRequired)], ['N_cap', num(r.capacity.sitesRequired)], ['N_sites', num(r.finalSites)], ['Facteur limitant', r.limitingFactor === 'coverage' ? 'Couverture' : 'Capacité']]} />
      <F n={8} title="Score QoS" formula="QoS = 0,4 × Eff_couv + 0,4 × Marge_cap + 0,2 × min(η / 6 × 100, 100)"
        text="Indicateur synthétique combinant la couverture, la marge de capacité et l'efficacité spectrale."
        vars={[['Eff_couv', `${num(r.kpis.coverageEfficiency, 1)} %`], ['Marge_cap', `${num(r.kpis.capacityEfficiency, 1)} %`], ['QoS', `${num(r.kpis.qosScore, 1)} / 100`]]} />
      <p className="px-1 pb-2 text-[12px] text-muted">Références : COST Action 231 — Digital mobile radio towards future generation systems ; 3GPP TS 36.211 / 36.213.</p>
    </div>
  );
}
