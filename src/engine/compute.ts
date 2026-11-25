import {
  CAPEX_K, ENV_CORRECTION, HEX_FACTOR, MIMO_EFFICIENCY, OPEX_K, PRB_BY_BANDWIDTH,
  PRB_USEFUL_MHZ, TARGET_UTILISATION,
} from './constants';
import type {
  Capacity, Cost, Coverage, Kpis, LinkBudget, Params, Propagation, Results,
} from './types';

const log10 = Math.log10;

/** Bilan de liaison : EIRP et MAPL (Maximum Allowable Path Loss). */
export function linkBudget(p: Params): LinkBudget {
  const { radio: r, enodeb: n, ue: u } = p;
  const totalLosses = r.cableLoss + r.bodyLoss + n.feederLoss;
  const eirp = r.txPower + r.antennaGainTx - r.cableLoss - n.feederLoss;
  const mapl =
    r.txPower + r.antennaGainTx + u.antennaGain - totalLosses - r.fadingMargin - r.interferenceMargin - u.sensitivity;
  return { txPower: r.txPower, txGain: r.antennaGainTx, rxGain: u.antennaGain, eirp, totalLosses, mapl, sensitivity: u.sensitivity };
}

/** Constantes du modèle COST-231 Hata : PL(d) = A + B·log10(d). */
export function cost231(f: number, hb: number, hm: number, cm: number) {
  const ahm = (1.1 * log10(f) - 0.7) * hm - (1.56 * log10(f) - 0.8);
  const A = 46.3 + 33.9 * log10(f) - 13.82 * log10(hb) - ahm + cm;
  const B = 44.9 - 6.55 * log10(hb);
  return { A, B, ahm };
}

export function propagation(p: Params, mapl: number): Propagation {
  const cm = ENV_CORRECTION[p.zone.environment];
  const { A, B, ahm } = cost231(p.radio.frequencyBand, p.enodeb.antennaHeight, p.ue.height, cm);
  const cellRadius = Math.max(0.1, Math.min(Math.pow(10, (mapl - A) / B), 50));
  const pathLoss = A + B * log10(Math.max(cellRadius, 0.1));
  return { pathLoss, cellRadius, correctionFactor: cm, A, B, ahm };
}

export function coverage(p: Params, cellRadius: number): Coverage {
  const sectors = p.enodeb.sectors;
  const cellArea = sectors >= 3 ? HEX_FACTOR * cellRadius * cellRadius : Math.PI * cellRadius * cellRadius;
  const siteArea = (sectors / 3) * cellArea;
  const sitesRequired = Math.ceil(p.zone.surface / siteArea);
  const totalCoverage = sitesRequired * siteArea;
  const coveragePercentage = Math.min((totalCoverage / p.zone.surface) * 100, 100);
  return { cellRadius, cellArea, siteArea, sitesRequired, totalCoverage, coveragePercentage };
}

export function capacity(p: Params): Capacity {
  const totalUsers = Math.ceil(p.zone.population * (p.zone.penetrationRate / 100));
  const prbCount = PRB_BY_BANDWIDTH[p.radio.bandwidth] ?? 50;
  const spectralEfficiency = MIMO_EFFICIENCY[p.enodeb.mimoConfig];
  const cellThroughput = prbCount * spectralEfficiency * PRB_USEFUL_MHZ;
  const siteThroughput = cellThroughput * p.enodeb.sectors;
  const totalTrafficDemand = totalUsers * ((8 * p.ue.trafficPerUser) / 3600);
  const sitesRequired = Math.ceil(totalTrafficDemand / (TARGET_UTILISATION * siteThroughput));
  const loadPerSite = sitesRequired > 0 ? (totalTrafficDemand / sitesRequired / siteThroughput) * 100 : 0;
  return { totalUsers, prbCount, spectralEfficiency, cellThroughput, siteThroughput, totalTrafficDemand, sitesRequired, loadPerSite };
}

export function compute(p: Params): Results {
  const lb = linkBudget(p);
  const prop = propagation(p, lb.mapl);
  const cov = coverage(p, prop.cellRadius);
  const cap = capacity(p);

  const finalSites = Math.max(cov.sitesRequired, cap.sitesRequired);
  const limitingFactor = cov.sitesRequired >= cap.sitesRequired ? 'coverage' : 'capacity';

  const env = p.zone.environment;
  const capexPerSite = CAPEX_K[env] * 1e3;
  const opexPerSitePerYear = OPEX_K[env] * 1e3;
  const totalCapex = finalSites * capexPerSite;
  const totalOpex5Years = finalSites * opexPerSitePerYear * 5;
  const totalCost5Years = totalCapex + totalOpex5Years;
  const cost: Cost = {
    capexPerSite, opexPerSitePerYear, totalCapex, totalOpex5Years, totalCost5Years,
    costPerKm2: p.zone.surface > 0 ? totalCost5Years / p.zone.surface : 0,
    costPerUser: cap.totalUsers > 0 ? totalCost5Years / cap.totalUsers : 0,
  };

  const coverageEfficiency = cov.coveragePercentage;
  const capacityEfficiency = Math.max(0, 100 - cap.loadPerSite);
  const se = cap.spectralEfficiency;
  const kpis: Kpis = {
    coverageEfficiency,
    capacityEfficiency,
    spectralEfficiencyTotal: se,
    costEfficiency: totalCost5Years > 0 ? (cap.totalUsers / totalCost5Years) * 1e3 : 0,
    qosScore: 0.4 * coverageEfficiency + 0.4 * capacityEfficiency + 0.2 * Math.min((se / 6) * 100, 100),
  };

  const load = finalSites > 0 ? (cap.totalTrafficDemand / (finalSites * cap.siteThroughput)) * 100 : 0;

  return {
    linkBudget: lb, propagation: prop, coverage: cov, capacity: cap,
    finalSites, limitingFactor, cost, kpis, networkLoad: Math.min(load, 100),
  };
}

/** Nombre de sites requis en faisant varier un paramètre (analyse de sensibilité). */
export function sweep(p: Params, apply: (p: Params, v: number) => Params, values: number[]) {
  return values.map((v) => {
    const r = compute(apply(p, v));
    return { x: v, coverage: r.coverage.sitesRequired, capacity: r.capacity.sitesRequired, final: r.finalSites };
  });
}
