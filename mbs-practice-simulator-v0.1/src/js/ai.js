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
      decision.marketing = 260000;
      decision.rd = 360000;
      decision.production *= 0.95;
      break;
    case 'Low Cost':
      decision.price *= 0.93;
      decision.marketing = 110000;
      decision.rd = 70000;
      decision.production *= 1.10;
      decision.maintenance = 220000;
      break;
    case 'Aggressive Growth':
      decision.price *= 0.98;
      decision.marketing = 380000;
      decision.rd = 220000;
      decision.production *= 1.18;
      decision.equipment = round >= 2 ? 300000 : decision.equipment;
      break;
    case 'R&D Heavy':
      decision.price *= 1.03;
      decision.rd = 460000;
      decision.marketing = 170000;
      break;
    case 'Volume Leader':
      decision.price *= 0.95;
      decision.production *= 1.20;
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
      decision.production *= 1.15;
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

  decision.price = clamp(decision.price, 4.5, 10);
  decision.production = Math.round(Math.max(100000, decision.production));
  decision.materialPurchase = Math.round(Math.max(0, decision.materialPurchase));
  return decision;
}
