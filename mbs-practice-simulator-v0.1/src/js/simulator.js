import { aiDecision } from './ai.js';
import {
  BASE_MARKET_SIZE,
  DISCOUNT_RATE,
  MATERIAL_PER_UNIT,
  MATERIAL_PRICE
} from './config.js';
import { snapshot, userCompany } from './state.js';
import { clamp, rngFrom } from './utils.js';

export function normalizeDecision(decision) {
  return {
    price: clamp(Number(decision.price) || 0, 3, 15),
    marketing: Math.max(0, Number(decision.marketing) || 0),
    rd: Math.max(0, Number(decision.rd) || 0),
    production: Math.max(0, Number(decision.production) || 0),
    materialPurchase: Math.max(0, Number(decision.materialPurchase) || 0),
    equipment: Math.max(0, Number(decision.equipment) || 0),
    maintenance: Math.max(0, Number(decision.maintenance) || 0),
    dividend: Math.max(0, Number(decision.dividend) || 0)
  };
}

export function economyForRound(state, round) {
  const random = rngFrom(`${state.roomCode || state.teamName || 'LOCAL'}-R${round}`);
  let growth = 0.96 + random() * 0.15;
  const seasonal = 0.96 + random() * 0.10;
  let rawIndex = 0.97 + random() * 0.10;
  let event = null;

  if (state.surpriseMode && round >= 2 && random() < 0.50) {
    const events = [
      { title: 'Raw Material Shock', text: 'Harga input industri naik tajam.', raw: 1.18, demand: 1, capacity: 1 },
      { title: 'Demand Boom', text: 'Momentum musiman mendorong permintaan pasar.', raw: 1, demand: 1.15, capacity: 1 },
      { title: 'Economic Slowdown', text: 'Permintaan melemah akibat perlambatan ekonomi.', raw: 1, demand: 0.88, capacity: 1 },
      { title: 'Equipment Disruption', text: 'Efisiensi kapasitas industri turun sementara.', raw: 1, demand: 1, capacity: 0.90 }
    ];
    event = events[Math.floor(random() * events.length)];
    rawIndex *= event.raw;
    growth *= event.demand;
  }

  return {
    priceIndex: Math.round(rawIndex * 10000) / 100,
    growth,
    seasonal,
    marketGrowth: growth,
    rawIndex,
    demandFactor: growth * seasonal,
    capacityFactor: event?.capacity || 1,
    event
  };
}

export function simulateRound(state) {
  if (state.currentRound >= state.maxRounds) return state;

  const round = state.currentRound + 1;
  const economy = economyForRound(state, round);
  const decisions = state.companies.map(company => (
    company.isUser
      ? normalizeDecision(state.draft)
      : normalizeDecision(aiDecision(company, round))
  ));

  const provisional = state.companies.map((company, index) => {
    const decision = decisions[index];
    const quality = clamp(
      company.quality + 0.08 * Math.log1p(decision.rd / 200000) - 0.005,
      0.10, 0.95
    );
    const image = clamp(
      company.image + 0.043 * Math.log1p(decision.marketing / 150000) - 0.015,
      0.10, 0.95
    );
    let capacity = company.capacity * (
      0.965 + clamp(decision.maintenance / 400000, 0, 2) * 0.020
    ) + (decision.equipment / 300000) * 12000;
    capacity *= economy.capacityFactor;
    capacity = Math.max(100000, capacity);

    const rawMaterialAvailable = company.rawMaterial + decision.materialPurchase;
    const production = Math.max(0, Math.min(
      decision.production,
      capacity,
      rawMaterialAvailable / MATERIAL_PER_UNIT
    ));
    const rawMaterialEnd = Math.max(0, rawMaterialAvailable - production * MATERIAL_PER_UNIT);
    const availableFinishedGoods = company.finishedGoods + production;
    const attractiveness = Math.exp(
      quality * 2.20 +
      image * 1.55 -
      ((decision.price / 6.40) - 1) * 2.30 +
      Math.log1p(decision.marketing / 180000) * 0.08 +
      Math.log1p(decision.rd / 220000) * 0.05
    );

    return { decision, quality, image, capacity, production, rawMaterialEnd, availableFinishedGoods, attractiveness };
  });

  const totalAttractiveness = provisional.reduce((sum, item) => sum + item.attractiveness, 0);
  const marketSize = BASE_MARKET_SIZE * economy.demandFactor;

  state.companies.forEach((company, index) => {
    const p = provisional[index];
    const decision = p.decision;
    const share = p.attractiveness / totalAttractiveness;
    const potentialDemand = marketSize * share;
    const sales = Math.min(potentialDemand, p.availableFinishedGoods);
    const finishedGoodsEnd = Math.max(0, p.availableFinishedGoods - sales);
    const utilization = p.production / Math.max(p.capacity, 1);
    const directUnitCost = 3.24 * economy.rawIndex + 0.20 * (1 - clamp(utilization, 0, 1));
    const purchaseCost = decision.materialPurchase * MATERIAL_PRICE * economy.rawIndex;
    const depreciation = 90000 + decision.equipment * 0.08;
    const warehouse =
      p.rawMaterialEnd * MATERIAL_PRICE * 0.006 +
      finishedGoodsEnd * directUnitCost * 0.012;
    const purchasingExpense = purchaseCost * 0.03;
    const interest = company.overdraft * 0.05;
    const fixedExpense =
      decision.marketing + decision.rd + decision.maintenance + 400000 +
      depreciation + warehouse + purchasingExpense + interest;

    const unitCost = directUnitCost + fixedExpense / Math.max(sales, 1);
    const revenue = sales * decision.price;
    const preTax = revenue - sales * unitCost;
    const tax = preTax > 0 ? preTax * 0.29 : 0;
    const netProfit = preTax - tax;
    const cashBeforeFinancing =
      company.cash + netProfit + depreciation - purchaseCost -
      decision.equipment - decision.dividend;
    const cash = Math.max(0, cashBeforeFinancing);
    const overdraft = Math.max(0, -cashBeforeFinancing);
    const equity = Math.max(1, company.equity + netProfit - decision.dividend);
    const currentAssets = cash + p.rawMaterialEnd * MATERIAL_PRICE + finishedGoodsEnd * directUnitCost;
    const currentRatio = currentAssets / Math.max(750000 + overdraft, 1);
    const roe = netProfit / Math.max(company.equity, 1);
    const profitMargin = netProfit / Math.max(revenue, 1);
    const discount = Math.pow(1 + DISCOUNT_RATE, round);
    const npv =
      company.npv +
      (netProfit + decision.dividend) / discount +
      (share - company.marketShare) * 1800000;
    const balancedScore = clamp(
      52 + profitMargin * 115 + roe * 90 + share * 110 +
      clamp((currentRatio - 1) * 9, -12, 20) -
      Math.min(overdraft / 100000, 18),
      0, 100
    );

    Object.assign(company, {
      price: decision.price,
      quality: p.quality,
      image: p.image,
      potentialDemand,
      sales,
      marketShare: share,
      revenue,
      production: p.production,
      capacity: p.capacity,
      rawMaterial: p.rawMaterialEnd,
      finishedGoods: finishedGoodsEnd,
      unitCost,
      netProfit,
      cash,
      overdraft,
      equity,
      currentRatio,
      roe,
      profitMargin,
      npv,
      balancedScore,
      lastDecision: decision
    });

    company.history.push(snapshot(company, round, decision, economy));
  });

  state.currentRound = round;
  state.economy = economy;
  state.lastEvent = economy.event;
  if (economy.event) {
    state.eventHistory = [...(state.eventHistory || []), { round, ...economy.event }];
  }
  state.decisionLocked = false;
  state.lockReason = '';
  state.timerRemaining = state.timerSeconds;

  const user = userCompany(state);
  state.draft = {
    price: Number(user.price.toFixed(2)),
    marketing: Math.round(user.lastDecision.marketing),
    rd: Math.round(user.lastDecision.rd),
    production: Math.round(Math.min(user.capacity * 1.05, Math.max(user.sales * 1.08, 200000))),
    materialPurchase: Math.round(
      Math.max(300000, user.production * MATERIAL_PER_UNIT - user.rawMaterial + 650000)
    ),
    equipment: 0,
    maintenance: 260000,
    dividend: 0
  };

  return state;
}
