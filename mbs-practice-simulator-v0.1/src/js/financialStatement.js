import { MATERIAL_PRICE } from './config.js';
import { userCompany } from './state.js';
import { officialFinancialForRound } from './officialSync.js';

const safe = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function fallbackFinancial(item, previous = null) {
  const d = item?.decision || {};
  const rawIndex = safe(item?.economy?.rawIndex) || 1;
  const revenue = safe(item?.revenue);
  const sales = Math.max(safe(item?.sales), 1);
  const unitCost = safe(item?.unitCost);
  const netProfit = safe(item?.netProfit);
  const depreciation = 90000 + safe(d.equipment) * 0.08;
  const totalCost = sales * unitCost;
  const interest = safe(previous?.overdraft) * 0.05;
  const tax = Math.max(0, (revenue - totalCost) - netProfit);
  const managementExpense = 400000;
  const marketingExpense = safe(d.marketing);
  const rdExpense = safe(d.rd);
  const maintenanceExpense = safe(d.maintenance);
  const purchaseCost = safe(d.materialPurchase) * MATERIAL_PRICE * rawIndex;
  const warehouseExpense = safe(item?.rawMaterial) * MATERIAL_PRICE * 0.006 + safe(item?.finishedGoods) * unitCost * 0.012;
  const purchasingExpense = purchaseCost * 0.03;
  const knownOperating = marketingExpense + rdExpense + maintenanceExpense + managementExpense + warehouseExpense + purchasingExpense + depreciation + interest + tax;
  const costOfGoodsSold = Math.max(0, Math.min(totalCost, totalCost - knownOperating * 0.25));
  const grossProfit = revenue - costOfGoodsSold;
  const operatingExpenses = Math.max(0, grossProfit - netProfit - interest - tax);
  const operatingProfit = grossProfit - operatingExpenses;
  const earningsBeforeTax = operatingProfit - interest;
  const beginningCash = safe(previous?.cash);
  const cashExpenditure = Math.max(0, revenue - netProfit - depreciation);
  const operatingCashFlow = revenue - cashExpenditure;
  const equipmentInvestment = safe(d.equipment);
  const dividend = safe(d.dividend);
  const endingCash = safe(item?.cash);
  const overdraft = safe(item?.overdraft);

  const rawMaterialInventory = safe(item?.rawMaterial) * MATERIAL_PRICE * rawIndex;
  const finishedGoodsInventory = safe(item?.finishedGoods) * Math.max(unitCost * 0.60, 0);
  const currentAssets = endingCash + rawMaterialInventory + finishedGoodsInventory;
  const currentLiabilities = 750000 + overdraft;
  const equity = safe(item?.equity);
  const totalLiabilities = currentLiabilities;
  const totalAssets = equity + totalLiabilities;
  const fixedAndOtherAssets = Math.max(0, totalAssets - currentAssets);

  const currentRatio = currentAssets / Math.max(currentLiabilities, 1);
  const quickRatio = endingCash / Math.max(currentLiabilities, 1);
  const inventoryValue = rawMaterialInventory + finishedGoodsInventory;
  const inventoryTurnover = costOfGoodsSold / Math.max(inventoryValue, 1);
  const fixedAssetTurnover = revenue / Math.max(fixedAndOtherAssets, 1);
  const totalAssetTurnover = revenue / Math.max(totalAssets, 1);
  const debtRatio = totalLiabilities / Math.max(totalAssets, 1);
  const timesInterestEarned = interest > 0 ? operatingProfit / interest : null;
  const netProfitMargin = netProfit / Math.max(revenue, 1);
  const basicProfitMargin = operatingProfit / Math.max(revenue, 1);
  const roa = netProfit / Math.max(totalAssets, 1);
  const roe = netProfit / Math.max(equity - netProfit + dividend, 1);
  const roce = operatingProfit / Math.max(equity + totalLiabilities - endingCash, 1);

  return {
    source: 'derived-legacy',
    balanceSheet: {
      cash: endingCash,
      rawMaterialInventory,
      finishedGoodsInventory,
      currentAssets,
      fixedAndOtherAssets,
      totalAssets,
      operatingLiabilities: 750000,
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
      equipmentInvestment,
      dividend,
      cashBeforeFinancing: beginningCash + operatingCashFlow - purchaseCost - equipmentInvestment - dividend,
      overdraft,
      endingCash
    },
    incomeStatement: {
      revenue,
      costOfGoodsSold,
      grossProfit,
      marketingExpense,
      rdExpense,
      maintenanceExpense,
      managementExpense,
      warehouseExpense,
      purchasingExpense,
      depreciation,
      operatingExpenses,
      operatingProfit,
      interestExpense: interest,
      earningsBeforeTax,
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
      netProfitMargin,
      basicProfitMargin,
      roa,
      roe,
      roce
    }
  };
}

export function financialForRound(state, round = state.currentRound) {
  const user = userCompany(state);
  const history = user?.history || [];
  const index = history.findIndex(item => Number(item.round) === Number(round));
  const item = index >= 0 ? history[index] : history.at(-1);
  const previous = index > 0 ? history[index - 1] : null;
  if (!item) return null;

  const official = officialFinancialForRound(state, round);
  if (official?.statement) {
    return {
      round: Number(round),
      item,
      statement: official.statement,
      isDerived: false,
      isOfficial: true,
      source: official.source || 'official-topboss'
    };
  }

  return {
    round: item.round,
    item,
    statement: item.financial || fallbackFinancial(item, previous),
    isDerived: !item.financial,
    isOfficial: false,
    source: item.financial ? 'simulated' : 'derived-legacy'
  };
}

export function availableFinancialRounds(state) {
  const user = userCompany(state);
  return (user?.history || []).map(item => Number(item.round));
}
