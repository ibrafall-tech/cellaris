export type Environment = 'urban' | 'suburban' | 'rural';
export type Mimo = '2x2' | '4x4' | '8x8';
export type Duplex = 'FDD' | 'TDD';

export interface ZoneParams {
  surface: number; // km²
  population: number;
  penetrationRate: number; // %
  environment: Environment;
}

export interface RadioParams {
  frequencyBand: number; // MHz
  bandwidth: number; // MHz
  duplexMode: Duplex;
  txPower: number; // dBm
  antennaGainTx: number; // dBi
  antennaGainRx: number; // dBi
  cableLoss: number; // dB
  bodyLoss: number; // dB
  fadingMargin: number; // dB
  interferenceMargin: number; // dB
}

export interface EnodebParams {
  antennaHeight: number; // m
  sectors: number;
  mimoConfig: Mimo;
  feederLoss: number; // dB
}

export interface UEParams {
  sensitivity: number; // dBm
  antennaGain: number; // dBi
  height: number; // m
  trafficPerUser: number; // MB/h (heure chargée)
  targetThroughput: number; // Mbps
}

export interface Params {
  zone: ZoneParams;
  radio: RadioParams;
  enodeb: EnodebParams;
  ue: UEParams;
}

export interface LinkBudget {
  txPower: number;
  txGain: number;
  rxGain: number;
  eirp: number;
  totalLosses: number;
  mapl: number;
  sensitivity: number;
}

export interface Propagation {
  pathLoss: number;
  cellRadius: number;
  correctionFactor: number;
  A: number;
  B: number;
  ahm: number;
}

export interface Coverage {
  cellRadius: number;
  cellArea: number;
  siteArea: number;
  sitesRequired: number;
  totalCoverage: number;
  coveragePercentage: number;
}

export interface Capacity {
  totalUsers: number;
  prbCount: number;
  spectralEfficiency: number;
  cellThroughput: number;
  siteThroughput: number;
  totalTrafficDemand: number;
  sitesRequired: number;
  loadPerSite: number;
}

export interface Cost {
  capexPerSite: number;
  opexPerSitePerYear: number;
  totalCapex: number;
  totalOpex5Years: number;
  totalCost5Years: number;
  costPerKm2: number;
  costPerUser: number;
}

export interface Kpis {
  coverageEfficiency: number;
  capacityEfficiency: number;
  spectralEfficiencyTotal: number;
  costEfficiency: number;
  qosScore: number;
}

export interface Results {
  linkBudget: LinkBudget;
  propagation: Propagation;
  coverage: Coverage;
  capacity: Capacity;
  finalSites: number;
  limitingFactor: 'coverage' | 'capacity';
  cost: Cost;
  kpis: Kpis;
  networkLoad: number;
}
