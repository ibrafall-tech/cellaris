import type { Params, Results } from '../engine/types';
import { ENV_LABEL } from '../engine/constants';
import { money, num, rate, type Currency } from './format';

/** Rapport PDF Cellaris (jsPDF chargé à la demande). */
export async function generatePdf(p: Params, r: Results, currency: Currency, save = true) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 18;
  let y = 0;
  const ink: [number, number, number] = [11, 18, 32];
  const muted: [number, number, number] = [100, 114, 140];
  const signal: [number, number, number] = [10, 158, 123];
  const fmtMoney = (v: number) => money(v, currency).replace(/ | /g, ' ');
  const n = (v: number, d = 0) => num(v, d).replace(/ | /g, ' ');

  // En-tête
  doc.setFillColor(7, 11, 20);
  doc.rect(0, 0, W, 46, 'F');
  doc.setFillColor(...signal);
  doc.rect(0, 46, W, 1.2, 'F');
  doc.setTextColor(77, 240, 192);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CELLARIS', M, 16);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('Rapport de dimensionnement LTE', M, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(180, 192, 214);
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Environnement ${ENV_LABEL[p.zone.environment].toLowerCase()}  ·  ${date}  ·  Ibrahima FALL`, M, 37);
  y = 60;

  // Résultat principal
  doc.setFillColor(238, 242, 248);
  doc.roundedRect(M, y, W - 2 * M, 30, 3, 3, 'F');
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(n(r.finalSites), M + 8, y + 15);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('sites eNodeB requis', M + 8, y + 23);
  const cols: [string, string][] = [
    ['Facteur limitant', r.limitingFactor === 'coverage' ? 'Couverture' : 'Capacité'],
    ['Rayon de cellule', `${n(r.propagation.cellRadius, 2)} km`],
    ['Charge réseau', `${n(r.networkLoad, 1)} %`],
    ['Score QoS', `${n(r.kpis.qosScore, 1)} / 100`],
  ];
  cols.forEach(([k, v], i) => {
    const x = M + 80 + (i % 2) * 48, yy = y + 11 + Math.floor(i / 2) * 11;
    doc.setFontSize(8); doc.setTextColor(...muted); doc.text(k, x, yy);
    doc.setFontSize(10.5); doc.setTextColor(...ink); doc.setFont('helvetica', 'bold'); doc.text(v, x, yy + 4.6); doc.setFont('helvetica', 'normal');
  });
  y += 42;

  const section = (title: string) => {
    if (y > 260) { doc.addPage(); y = 22; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...signal);
    doc.text(title.toUpperCase(), M, y);
    doc.setDrawColor(221, 228, 239); doc.line(M, y + 2.5, W - M, y + 2.5);
    y += 9;
  };
  const table = (rows: [string, string][]) => {
    const colW = (W - 2 * M) / 2;
    rows.forEach(([k, v], i) => {
      const x = M + (i % 2) * colW;
      if (i % 2 === 0 && i) y += 7;
      if (y > 280) { doc.addPage(); y = 22; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...muted); doc.text(k, x, y);
      doc.setTextColor(...ink); doc.setFont('helvetica', 'bold'); doc.text(v, x + colW - 6, y, { align: 'right' });
    });
    y += 13;
  };

  section('1. Paramètres d’entrée');
  table([
    ['Surface', `${n(p.zone.surface)} km²`], ['Population', n(p.zone.population)],
    ['Taux de pénétration', `${p.zone.penetrationRate} %`], ['Bande de fréquence', `${p.radio.frequencyBand} MHz`],
    ['Largeur de bande', `${n(p.radio.bandwidth, p.radio.bandwidth % 1 ? 1 : 0)} MHz (${p.radio.duplexMode})`], ['Puissance Tx', `${p.radio.txPower} dBm`],
    ['Gain antenne Tx', `${n(p.radio.antennaGainTx, 1)} dBi`], ['Pertes câbles / corps', `${n(p.radio.cableLoss, 1)} / ${n(p.radio.bodyLoss, 1)} dB`],
    ['Marges fading / interf.', `${n(p.radio.fadingMargin, 1)} / ${n(p.radio.interferenceMargin, 1)} dB`], ['Hauteur antenne', `${p.enodeb.antennaHeight} m`],
    ['Secteurs / MIMO', `${p.enodeb.sectors} / ${p.enodeb.mimoConfig.replace('x', ' x ')}`], ['Pertes feeder', `${n(p.enodeb.feederLoss, 1)} dB`],
    ['Sensibilité UE', `${p.ue.sensitivity} dBm`], ['Hauteur UE', `${n(p.ue.height, 1)} m`],
    ['Trafic / utilisateur', `${p.ue.trafficPerUser} Mo/h`], ['Débit cible', `${p.ue.targetThroughput} Mbps`],
  ]);

  section('2. Bilan de liaison');
  table([
    ['EIRP', `${n(r.linkBudget.eirp, 1)} dBm`], ['Pertes totales', `${n(r.linkBudget.totalLosses, 1)} dB`],
    ['MAPL', `${n(r.linkBudget.mapl, 1)} dB`], ['Path loss au rayon', `${n(r.propagation.pathLoss, 1)} dB`],
  ]);

  section('3. Couverture (COST-231 Hata)');
  table([
    ['Rayon de cellule', `${n(r.coverage.cellRadius, 2)} km`], ['Surface par cellule', `${n(r.coverage.cellArea, 2)} km²`],
    ['Sites requis', n(r.coverage.sitesRequired)], ['Taux de couverture', `${n(r.coverage.coveragePercentage, 1)} %`],
  ]);

  section('4. Capacité');
  table([
    ['Utilisateurs', n(r.capacity.totalUsers)], ['PRB disponibles', n(r.capacity.prbCount)],
    ['Débit / cellule', `${n(r.capacity.cellThroughput, 1)} Mbps`], ['Débit / site', `${n(r.capacity.siteThroughput, 1)} Mbps`],
    ['Trafic total', rate(r.capacity.totalTrafficDemand).replace(/ | /g, ' ')], ['Sites requis', n(r.capacity.sitesRequired)],
  ]);

  section('5. Coûts (5 ans)');
  table([
    ['CAPEX total', fmtMoney(r.cost.totalCapex)], ['OPEX 5 ans', fmtMoney(r.cost.totalOpex5Years)],
    ['Coût total', fmtMoney(r.cost.totalCost5Years)], ['Coût / abonné', fmtMoney(r.cost.costPerUser)],
  ]);

  section('6. Indicateurs');
  table([
    ['Efficacité de couverture', `${n(r.kpis.coverageEfficiency, 1)} %`], ['Marge de capacité', `${n(r.kpis.capacityEfficiency, 1)} %`],
    ['Efficacité spectrale', `${n(r.kpis.spectralEfficiencyTotal, 1)} bit/s/Hz`], ['Score QoS', `${n(r.kpis.qosScore, 1)} / 100`],
  ]);

  // Pied de page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(...muted); doc.setFont('helvetica', 'normal');
    doc.text('Cellaris — Planification de réseaux LTE · Ibrahima FALL', M, 290);
    doc.text(`${i} / ${pages}`, W - M, 290, { align: 'right' });
  }
  if (save) doc.save(`cellaris-rapport-${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
}
