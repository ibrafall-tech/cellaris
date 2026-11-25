import type { Environment, Mimo, Params } from './types';

/** Facteur de correction COST-231 (dB) selon l'environnement. */
export const ENV_CORRECTION: Record<Environment, number> = { urban: 3, suburban: 0, rural: -5 };

/** Efficacité spectrale (bit/s/Hz) selon la configuration MIMO. */
export const MIMO_EFFICIENCY: Record<Mimo, number> = { '2x2': 2.4, '4x4': 4.2, '8x8': 6 };

/** Nombre de PRB par largeur de bande LTE (MHz). */
export const PRB_BY_BANDWIDTH: Record<number, number> = { 1.4: 6, 3: 15, 5: 25, 10: 50, 15: 75, 20: 100 };

/** CAPEX par site (k$) et OPEX par site et par an (k$). */
export const CAPEX_K: Record<Environment, number> = { urban: 85, suburban: 70, rural: 55 };
export const OPEX_K: Record<Environment, number> = { urban: 12, suburban: 10, rural: 8 };

export const FREQUENCY_BANDS = [700, 800, 900, 1800, 2100, 2600] as const;
export const BANDWIDTHS = [1.4, 3, 5, 10, 15, 20] as const;
export const MIMO_CONFIGS: Mimo[] = ['2x2', '4x4', '8x8'];
export const SECTOR_OPTIONS = [1, 3, 6] as const;

/** Débit utile par PRB : 180 kHz × (1 − 25 % d'overhead) = 0,135 MHz. */
export const PRB_USEFUL_MHZ = 0.135;
/** Taux d'utilisation cible des sites. */
export const TARGET_UTILISATION = 0.7;
/** Facteur géométrique d'une cellule hexagonale tri-sectorielle. */
export const HEX_FACTOR = 2.6;

export const ENV_LABEL: Record<Environment, string> = {
  urban: 'Urbain',
  suburban: 'Suburbain',
  rural: 'Rural',
};

export const PRESETS: Record<Environment, Params> = {
  urban: {
    zone: { surface: 150, population: 2_500_000, penetrationRate: 75, environment: 'urban' },
    radio: {
      frequencyBand: 1800, bandwidth: 20, duplexMode: 'FDD', txPower: 46, antennaGainTx: 18,
      antennaGainRx: 0, cableLoss: 2, bodyLoss: 3, fadingMargin: 8, interferenceMargin: 3,
    },
    enodeb: { antennaHeight: 30, sectors: 3, mimoConfig: '4x4', feederLoss: 0.5 },
    ue: { sensitivity: -95, antennaGain: 0, height: 1.5, trafficPerUser: 500, targetThroughput: 10 },
  },
  suburban: {
    zone: { surface: 400, population: 800_000, penetrationRate: 65, environment: 'suburban' },
    radio: {
      frequencyBand: 1800, bandwidth: 15, duplexMode: 'FDD', txPower: 46, antennaGainTx: 18,
      antennaGainRx: 0, cableLoss: 2, bodyLoss: 3, fadingMargin: 7, interferenceMargin: 2,
    },
    enodeb: { antennaHeight: 35, sectors: 3, mimoConfig: '2x2', feederLoss: 0.5 },
    ue: { sensitivity: -95, antennaGain: 0, height: 1.5, trafficPerUser: 400, targetThroughput: 8 },
  },
  rural: {
    zone: { surface: 1000, population: 200_000, penetrationRate: 50, environment: 'rural' },
    radio: {
      frequencyBand: 800, bandwidth: 10, duplexMode: 'FDD', txPower: 46, antennaGainTx: 18,
      antennaGainRx: 0, cableLoss: 2, bodyLoss: 3, fadingMargin: 6, interferenceMargin: 1,
    },
    enodeb: { antennaHeight: 40, sectors: 3, mimoConfig: '2x2', feederLoss: 0.5 },
    ue: { sensitivity: -95, antennaGain: 0, height: 1.5, trafficPerUser: 300, targetThroughput: 5 },
  },
};
