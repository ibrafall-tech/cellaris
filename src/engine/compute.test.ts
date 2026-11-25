import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { PRESETS } from './constants';

// Valeurs de référence relevées sur la version d'origine (my-lte-network-dimensioning.vercel.app).
describe('moteur de dimensionnement', () => {
  it('reproduit le preset urbain', () => {
    const r = compute(PRESETS.urban);
    expect(r.linkBudget.mapl).toBeCloseTo(142.5, 5);
    expect(r.linkBudget.eirp).toBeCloseTo(61.5, 5);
    expect(r.finalSites).toBe(17497);
    expect(r.limitingFactor).toBe('capacity');
  });

  it('calcule un rayon borné et un résultat cohérent pour chaque preset', () => {
    for (const p of Object.values(PRESETS)) {
      const r = compute(p);
      expect(r.propagation.cellRadius).toBeGreaterThanOrEqual(0.1);
      expect(r.propagation.cellRadius).toBeLessThanOrEqual(50);
      expect(r.finalSites).toBe(Math.max(r.coverage.sitesRequired, r.capacity.sitesRequired));
      expect(r.kpis.qosScore).toBeGreaterThanOrEqual(0);
      expect(r.kpis.qosScore).toBeLessThanOrEqual(100);
    }
  });
});
