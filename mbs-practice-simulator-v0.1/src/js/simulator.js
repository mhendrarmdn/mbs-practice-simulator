import { aiDecision } from './ai.js';
import {
  BASE_MARKET_SIZE,
  CAPACITY_AGING_RATE,
  CAPACITY_COST_PER_UNIT,
  DISCOUNT_RATE,
  MAINTENANCE_REFERENCE,
  MATERIAL_PER_UNIT,
  MATERIAL_PRICE,
  OVERTIME_LIMIT,
  SCENARIO_PRESETS,
  TARGET_CONVERSION_FACTOR
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
  const presetKey = state.mode === 'competition' ? 'auto' : (state.scenarioPreset || 'auto');
  const preset = SCENARIO_PRESETS[presetKey] || SCENARIO_PRESETS.auto;

  if (presetKey === 'baseline') {
    return {
      priceIndex: 100, growth: 1, seasonal: 1, marketGrowth: 1,
      rawIndex: 1, demandFactor: 1, capacityFactor: 1, event: null, presetKey
    };
  }

  let growth = 0.96 + random() * 0.15;
  const seasonal = 0.96 + random() * 0.10;
  let rawIndex = 0.97 + random() * 0.10;
  let event = null;
  let capacityFactor = 1;

  if (presetKey !== 'auto') {
    event = preset.event || null;
    rawIndex *= preset.raw || 1;
    growth *= preset.demand || 1;
    capacityFactor = preset.capacity || 1;
  } else if (state.surpriseMode && round >= 2 && random() < 0.50) {
    const events = [
      { title: 'Raw Material Shock', text: 'Harga input industri naik tajam.', raw: 1.18, demand: 1, capacity: 1 },
      { title: 'Demand Boom', text: 'Momentum musiman mendorong permintaan pasar.', raw: 1, demand: 1.15, capacity: 1 },
      { title: 'Economic Slowdown', text: 'Permintaan melemah akibat perlambatan ekonomi.', raw: 1, demand: 0.88, capacity: 1 },
      { title: 'Equipment Disruption', text: 'Efisiensi kapasitas industri turun sementara.', raw: 1, demand: 1, capacity: 0.90 }
    ];
    event = events[Math.floor(random() * events.length)];
    rawIndex *= event.raw;
    growth *= event.demand;
    capacityFactor = event.capacity || 1;
  }

  return {
    priceIndex: Math.round(rawIndex * 10000) / 100,
    growth, seasonal, marketGrowth: growth, rawIndex,
    demandFactor: growth * seasonal, capacityFactor, event, presetKey
  };
}

function nextConversionFactor(current, maintenance) {
  // Workbook establishes timing and an optimal reference of ~0.7, but not a proprietary response curve.
  // This transparent practice curve makes current maintenance affect NEXT round.
  const naturalDeterioration = 0.02;
  const maintenanceRecovery = naturalDeterioration * clamp(maintenance / MAINTENANCE_REFERENCE, 0, 1.5);
  return clamp(current - naturalDeterioration + maintenanceRecovery, 0.50, 0.75);
}

export function simulateRound(state) {
  if (state.currentRound >= state.maxRounds) return state;

  const round = state.currentRound + 1;
  const calibrated = state.logicCalibrationProfile === 'phase1-r1-v14';
  const qualityResponse = calibrated ? QUALITY_RD_RESPONSE : 0.08;
  const imageResponse = calibrated ? IMAGE_MARKETING_RESPONSE : 0.043;
  const marketingWeight = calibrated ? ATTRACTIVENESS_MARKETING_WEIGHT : 0.08;
  const rdWeight = calibrated ? ATTRACTIVENESS_RD_WEIGHT : 0.05;
  const directUnitCostBase = calibrated ? DIRECT_UNIT_COST_BASE : 3.24;
  const economy = economyForRound(state, round);
  const decisions = state.companies.map(company => (
    company.isUser ? normalizeDecision(state.draft) : normalizeDecision(aiDecision(company, round))
  ));

  const provisional = state.companies.map((company, index) => {
    const decision = decisions[index];
    const beginCapacity = Math.max(100000, Number(company.capacity || 0));
    const effectiveCapacity = beginCapacity * economy.capacityFactor;
    const maxProductionCapacity = effectiveCapacity * (1 + OVERTIME_LIMIT);
    const beginRawMaterial = Math.max(0, Number(company.rawMaterial || 0));
    const conversionFactor = Number(company.conversionFactor || TARGET_CONVERSION_FACTOR);

    const quality = clamp(
      company.quality + 0.08 * Math.log1p(decision.rd / 200000) - 0.005,
      0.10, 0.95
    );
    const image = clamp(
      company.image + 0.043 * Math.log1p(decision.marketing / 150000) - 0.015,
      0.10, 0.95
    );

    // Procurement ordered in this round is delivered at the END of this round / beginning of next.
    // It cannot rescue a raw-material shortage for current production.
    const materialLimitedProduction = beginRawMaterial / MATERIAL_PER_UNIT;
    const requestedBeforeEfficiency = Math.max(0, Math.min(
      decision.production,
      maxProductionCapacity,
      materialLimitedProduction
    ));

    // The exact proprietary conversion equation is unknown. Keep a bounded, transparent efficiency proxy
    // centered on the workbook's ~0.7 reference.
    const efficiencyIndex = clamp(conversionFactor / TARGET_CONVERSION_FACTOR, 0.80, 1.03);
    const production = requestedBeforeEfficiency * efficiencyIndex;
    const materialConsumed = Math.min(beginRawMaterial, production * MATERIAL_PER_UNIT);
    const procurementDelivered = decision.materialPurchase;
    const rawMaterialEnd = Math.max(0, beginRawMaterial - materialConsumed + procurementDelivered);
    const availableFinishedGoods = company.finishedGoods + production;

    // Current maintenance/equipment decisions materialize NEXT round.
    const nextCapacity = Math.max(
      100000,
      beginCapacity * (1 - CAPACITY_AGING_RATE) + decision.equipment / CAPACITY_COST_PER_UNIT
    );
    const conversionNext = nextConversionFactor(conversionFactor, decision.maintenance);

    const attractiveness = Math.exp(
      quality * 2.20 +
      image * 1.55 -
      ((decision.price / 6.40) - 1) * 2.30 +
      Math.log1p(decision.marketing / 180000) * 0.08 +
      Math.log1p(decision.rd / 220000) * 0.05
    );

    return {
      decision, quality, image, beginCapacity, effectiveCapacity, maxProductionCapacity,
      beginRawMaterial, procurementDelivered, rawMaterialEnd, production, availableFinishedGoods,
      nextCapacity, conversionFactor, conversionNext, attractiveness
    };
  });

  const totalAttractiveness = provisional.reduce((sum, item) => sum + item.attractiveness, 0);
  const marketSize = BASE_MARKET_SIZE * economy.demandFactor;

  state.companies.forEach((company, index) => {
    const p = provisional[index];
    const decision = p.decision;
    const beginningCash = company.cash;
    const beginningEquity = company.equity;
    const share = p.attractiveness / totalAttractiveness;
    const potentialDemand = marketSize * share;
    const sales = Math.min(potentialDemand, p.availableFinishedGoods);
    const finishedGoodsEnd = Math.max(0, p.availableFinishedGoods - sales);
    const utilization = p.production / Math.max(p.effectiveCapacity, 1);

    const conversionWaste = clamp((TARGET_CONVERSION_FACTOR - p.conversionFactor) / TARGET_CONVERSION_FACTOR, -0.05, 0.25);
    const overtimePenalty = Math.max(0, utilization - 1) * 0.40;
    const directUnitCost = 3.24 * economy.rawIndex * (1 + conversionWaste) + overtimePenalty;

    const purchaseCost = decision.materialPurchase * MATERIAL_PRICE * economy.rawIndex;
    const depreciation = 90000 + decision.equipment * 0.08;
    const warehouse =
      p.rawMaterialEnd * MATERIAL_PRICE * 0.006 +
      finishedGoodsEnd * directUnitCost * 0.012;
    const purchasingExpense = purchaseCost * 0.03;
    const interest = company.overdraft * 0.05;
    const managementExpense = 400000;

    const costOfGoodsSold = sales * directUnitCost;
    const revenue = sales * decision.price;
    const grossProfit = revenue - costOfGoodsSold;
    const operatingExpenses =
      decision.marketing + decision.rd + decision.maintenance + managementExpense +
      depreciation + warehouse + purchasingExpense;
    const operatingProfit = grossProfit - operatingExpenses;
    const preTax = operatingProfit - interest;
    const tax = preTax > 0 ? preTax * 0.29 : 0;
    const netProfit = preTax - tax;
    const fixedExpense = operatingExpenses + interest;
    const unitCost = directUnitCost + fixedExpense / Math.max(sales, 1);

    const cashExpenditure = Math.max(0, revenue - netProfit - depreciation);
    const operatingCashFlow = revenue - cashExpenditure;
    const cashBeforeFinancing =
      beginningCash + operatingCashFlow - purchaseCost -
      decision.equipment - decision.dividend;
    const cash = Math.max(0, cashBeforeFinancing);
    const overdraft = Math.max(0, -cashBeforeFinancing);
    const equity = Math.max(1, beginningEquity + netProfit - decision.dividend);

    const rawMaterialInventoryValue = p.rawMaterialEnd * MATERIAL_PRICE * economy.rawIndex;
    const finishedGoodsInventoryValue = finishedGoodsEnd * directUnitCost;
    const currentAssets = cash + rawMaterialInventoryValue + finishedGoodsInventoryValue;
    const operatingLiabilities = 750000;
    const currentLiabilities = operatingLiabilities + overdraft;
    const totalLiabilities = currentLiabilities;
    const totalAssets = equity + totalLiabilities;
    const fixedAndOtherAssets = Math.max(0, totalAssets - currentAssets);

    const currentRatio = currentAssets / Math.max(currentLiabilities, 1);
    const quickRatio = cash / Math.max(currentLiabilities, 1);
    const inventoryTurnover = costOfGoodsSold / Math.max(rawMaterialInventoryValue + finishedGoodsInventoryValue, 1);
    const fixedAssetTurnover = revenue / Math.max(fixedAndOtherAssets, 1);
    const totalAssetTurnover = revenue / Math.max(totalAssets, 1);
    const debtRatio = totalLiabilities / Math.max(totalAssets, 1);
    const timesInterestEarned = interest > 0 ? operatingProfit / interest : null;
    const roe = netProfit / Math.max(beginningEquity, 1);
    const profitMargin = netProfit / Math.max(revenue, 1);
    const basicProfitMargin = operatingProfit / Math.max(revenue, 1);
    const roa = netProfit / Math.max(totalAssets, 1);
    const roce = operatingProfit / Math.max(equity + totalLiabilities - cash, 1);
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
      capacity: p.nextCapacity,
      rawMaterial: p.rawMaterialEnd,
      finishedGoods: finishedGoodsEnd,
      conversionFactor: p.conversionNext,
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
      financial: {
        source: 'practice-model',
        balanceSheet: {
          cash,
          rawMaterialInventory: rawMaterialInventoryValue,
          finishedGoodsInventory: finishedGoodsInventoryValue,
          currentAssets,
          fixedAndOtherAssets,
          totalAssets,
          operatingLiabilities,
          overdraft,
          totalLiabilities,
          ownersEquity: equity,
          totalLiabilitiesAndEquity: totalLiabilities + equity
        },
        cashFlow: {
          beginningCash,
          revenue,
          cashExpenditure,
          operatingCashFlow,
          rawMaterialPurchase: purchaseCost,
          equipmentInvestment: decision.equipment,
          dividend: decision.dividend,
          cashBeforeFinancing,
          overdraft,
          endingCash: cash
        },
        incomeStatement: {
          revenue,
          costOfGoodsSold,
          grossProfit,
          marketingExpense: decision.marketing,
          rdExpense: decision.rd,
          maintenanceExpense: decision.maintenance,
          managementExpense,
          warehouseExpense: warehouse,
          purchasingExpense,
          depreciation,
          operatingExpenses,
          operatingProfit,
          interestExpense: interest,
          earningsBeforeTax: preTax,
          tax,
          netEarnings: netProfit
        },
        ratios: {
          currentRatio,
          quickRatio,
          inventoryTurnover,
          fixedAssetTurnover,
          totalAssetTurnover,
          debtRatio,
          timesInterestEarned,
          netProfitMargin: profitMargin,
          basicProfitMargin,
          roa,
          roe,
          roce
        }
      },
      lastDecision: decision
    });

    company.history.push(snapshot(company, round, decision, economy, {
      beginCapacity: p.beginCapacity,
      maxProductionCapacity: p.maxProductionCapacity,
      beginRawMaterial: p.beginRawMaterial,
      procurementDelivered: p.procurementDelivered,
      nextConversionFactor: p.conversionNext
    }));
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
    production: Math.round(Math.min(user.capacity * 1.25, Math.max(user.sales * 1.08, 200000))),
    materialPurchase: Math.round(Math.max(300000, user.production * MATERIAL_PER_UNIT - user.rawMaterial + 650000)),
    equipment: 0,
    maintenance: MAINTENANCE_REFERENCE,
    dividend: 0
  };

  return state;
}
