import { clamp } from './utils.js';

export function aiDecision(company, round) {
  const demand = company.potentialDemand || company.sales;
  const capacity = company.capacity;
  const shortage = Math.max(0, demand - (company.finishedGoods + capacity));
  const baseProduction = Math.max(220000, Math.min(demand * 1.05, capacity * 1.08));

  const decision = {
    price: company.price,
    marketing: 180000,
    rd: 120000,
    production: baseProduction,
    materialPurchase: Math.max(350000, baseProduction * 1.43 - company.rawMaterial + 500000),
    equipment: shortage > 70000 ? 300000 : 0,
    maintenance: 250000,
    dividend: 0
  };

  switch (company.strategy) {
    case 'Premium':
      decision.price *= 1.08;
      decision.marketing = 270000;
      decision.rd = 380000;
      decision.production *= 0.95;
      break;
    case 'Low Cost':
      decision.price *= 0.93;
      decision.marketing = 110000;
      decision.rd = 70000;
      decision.production *= 1.12;
      decision.maintenance = 220000;
      break;
    case 'Aggressive Growth':
      decision.price *= 0.98;
      decision.marketing = 390000;
      decision.rd = 220000;
      decision.production *= 1.20;
      decision.equipment = round >= 2 ? 300000 : decision.equipment;
      break;
    case 'R&D Heavy':
      decision.price *= 1.03;
      decision.rd = 470000;
      decision.marketing = 170000;
      break;
    case 'Volume Leader':
      decision.price *= 0.95;
      decision.production *= 1.22;
      decision.materialPurchase *= 1.20;
      break;
    case 'Conservative':
      decision.price *= 1.01;
      decision.marketing = 130000;
      decision.rd = 90000;
      decision.production *= 0.94;
      decision.maintenance = 300000;
      if (company.netProfit > 450000) decision.dividend = 100000;
      break;
    case 'Capacity Expansion':
      decision.production *= 1.16;
      decision.equipment = 450000;
      decision.maintenance = 300000;
      decision.materialPurchase *= 1.25;
      break;
    case 'Cash Maximizer':
      decision.price *= 1.04;
      decision.marketing = 100000;
      decision.rd = 60000;
      decision.equipment = 0;
      decision.production *= 0.95;
      if (company.netProfit > 300000) decision.dividend = 150000;
      break;
    default:
      decision.marketing = 200000;
      decision.rd = 180000;
      decision.maintenance = 260000;
  }

  // v0.2 adaptive response: bots react to their prior financial/operating position.
  if (company.netProfit < 0) {
    decision.marketing *= 0.90;
    decision.rd *= 0.90;
    decision.equipment *= 0.60;
    decision.price *= 1.015;
  }
  if (company.finishedGoods > company.sales * 0.30) {
    decision.production *= 0.88;
    decision.price *= 0.985;
  }
  if (company.marketShare < 0.06 && company.netProfit > 0) {
    decision.marketing *= 1.12;
  }
  if (company.overdraft > 0) {
    decision.equipment *= 0.35;
    decision.dividend = 0;
    decision.materialPurchase *= 0.90;
  }

  decision.price = clamp(decision.price, 4.5, 10);
  decision.production = Math.round(Math.max(100000, decision.production));
  decision.materialPurchase = Math.round(Math.max(0, decision.materialPurchase));
  decision.marketing = Math.round(decision.marketing);
  decision.rd = Math.round(decision.rd);
  decision.equipment = Math.round(decision.equipment);
  return decision;
}
