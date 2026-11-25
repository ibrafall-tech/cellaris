import type { Params } from '../engine/types';

export interface NumField {
  group: keyof Params;
  key: string;
  label: string;
  unit?: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  digits?: number;
}

export const ZONE_FIELDS: NumField[] = [
  { group: 'zone', key: 'surface', label: 'Surface', unit: 'km²', hint: 'Surface totale de la zone à couvrir', min: 1, max: 2000, step: 1 },
  { group: 'zone', key: 'population', label: 'Population', unit: 'hab.', hint: "Nombre total d'habitants dans la zone", min: 10_000, max: 10_000_000, step: 10_000 },
  { group: 'zone', key: 'penetrationRate', label: 'Taux de pénétration', unit: '%', hint: 'Part de la population abonnée au réseau mobile', min: 10, max: 100, step: 1 },
];

export const RADIO_FIELDS: NumField[] = [
  { group: 'radio', key: 'txPower', label: 'Puissance Tx', unit: 'dBm', hint: "Puissance d'émission de la station de base", min: 20, max: 60, step: 1 },
  { group: 'radio', key: 'antennaGainTx', label: 'Gain antenne Tx', unit: 'dBi', hint: "Gain de l'antenne d'émission", min: 0, max: 25, step: 0.5, digits: 1 },
  { group: 'radio', key: 'cableLoss', label: 'Pertes câbles', unit: 'dB', hint: 'Pertes dans les câbles et connecteurs', min: 0, max: 10, step: 0.5, digits: 1 },
  { group: 'radio', key: 'bodyLoss', label: 'Pertes corps', unit: 'dB', hint: 'Pertes dues au corps humain', min: 0, max: 10, step: 0.5, digits: 1 },
  { group: 'radio', key: 'fadingMargin', label: 'Marge de fading', unit: 'dB', hint: "Marge d'évanouissement (shadowing)", min: 0, max: 15, step: 0.5, digits: 1 },
  { group: 'radio', key: 'interferenceMargin', label: "Marge d'interférence", unit: 'dB', hint: "Marge pour l'interférence inter-cellules", min: 0, max: 10, step: 0.5, digits: 1 },
];

export const ENODEB_FIELDS: NumField[] = [
  { group: 'enodeb', key: 'antennaHeight', label: 'Hauteur antenne', unit: 'm', hint: "Hauteur de l'antenne au-dessus du sol (h_b)", min: 10, max: 80, step: 1 },
  { group: 'enodeb', key: 'feederLoss', label: 'Pertes feeder', unit: 'dB', hint: 'Pertes dans le feeder (câble coaxial)', min: 0, max: 5, step: 0.1, digits: 1 },
];

export const UE_FIELDS: NumField[] = [
  { group: 'ue', key: 'sensitivity', label: 'Sensibilité', unit: 'dBm', hint: 'Sensibilité minimale du récepteur', min: -120, max: -70, step: 1 },
  { group: 'ue', key: 'antennaGain', label: 'Gain antenne', unit: 'dBi', hint: "Gain de l'antenne du terminal", min: -5, max: 5, step: 0.5, digits: 1 },
  { group: 'ue', key: 'height', label: 'Hauteur UE', unit: 'm', hint: 'Hauteur du terminal mobile (h_m)', min: 1, max: 3, step: 0.1, digits: 1 },
  { group: 'ue', key: 'trafficPerUser', label: 'Trafic / utilisateur', unit: 'Mo/h', hint: 'Trafic moyen par utilisateur en heure chargée', min: 50, max: 2000, step: 10 },
  { group: 'ue', key: 'targetThroughput', label: 'Débit cible', unit: 'Mbps', hint: 'Débit minimum cible par utilisateur', min: 1, max: 100, step: 1 },
];
