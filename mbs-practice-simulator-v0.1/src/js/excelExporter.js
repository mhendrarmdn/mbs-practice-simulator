import * as XLSX from 'xlsx';
import { decisionMatrices } from './decisionMatrix.js';
import { buildRound6Review } from './workbookLab.js';
import { strategyAlignment } from './strategySystem.js';
import { userCompany } from './state.js';

function addSheet(book, name, rows, widths = []) {
  const sheet = Array.isArray(rows?.[0])
    ? XLSX.utils.aoa_to_sheet(rows)
    : XLSX.utils.json_to_sheet(rows || []);
  if (widths.length) sheet['!cols'] = widths.map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(book, sheet, name.slice(0, 31));
}

function roundRows(state) {
  const user = userCompany(state);
  return (user.history || []).map(item => ({
    Round: `R${item.round}`,
    Price: item.decision?.price ?? item.price,
    Marketing: item.decision?.marketing ?? 0,
    'R&D': item.decision?.rd ?? 0,
    'Production Request': item.decision?.production ?? item.production,
    Procurement: item.decision?.materialPurchase ?? 0,
    Equipment: item.decision?.equipment ?? 0,
    Maintenance: item.decision?.maintenance ?? 0,
    Dividend: item.decision?.dividend ?? 0,
    Quality: item.quality,
    Image: item.image,
    'Potential Demand': item.potentialDemand,
    Sales: item.sales,
    'Market Share': item.marketShare,
    Revenue: item.revenue,
    'Actual Production': item.production,
    'Beginning Capacity': item.beginCapacity,
    'Max Production Capacity': item.maxProductionCapacity,
    'Next Capacity': item.capacity,
    'Beginning RM': item.beginRawMaterial,
    'Procurement Delivered': item.procurementDelivered,
    'Ending RM': item.rawMaterial,
    'Finished Goods': item.finishedGoods,
    'Conversion Factor': item.conversionFactor,
    'Next Conversion Factor': item.nextConversionFactor,
    'Unit Cost': item.unitCost,
    'Net Profit': item.netProfit,
    Cash: item.cash,
    Overdraft: item.overdraft,
    Equity: item.equity,
    'Current Ratio': item.currentRatio,
    ROE: item.roe,
    'Profit Margin': item.profitMargin,
    'Practice NPV': item.npv,
    'Balanced Score': item.balancedScore
  }));
}

function r6PlanRows(state) {
  const review = buildRound6Review(state);
  const plan = state.workbookPlan || {};
  const d = plan.decision || state.draft || {};
  return [
    ['Workbook Round 6 Business Plan', state.teamName],
    ['Status', plan.finalizedAt ? 'FINALIZED' : 'DRAFT'],
    ['Finalized At', plan.finalizedAt || ''],
    ['', ''],
    ['Decision', 'Value'],
    ['Price', d.price ?? 0],
    ['Marketing', d.marketing ?? 0],
    ['R&D', d.rd ?? 0],
    ['Production Request', d.production ?? 0],
    ['Raw Material Procurement', d.materialPurchase ?? 0],
    ['Maintenance', d.maintenance ?? 0],
    ['Equipment Investment', d.equipment ?? 0],
    ['Dividend', d.dividend ?? 0],
    ['', ''],
    ['R0–R5 Review', ''],
    ...review.observations.map((x, i) => [`Observation ${i + 1}`, x]),
    ['', ''],
    ['Planning Rationale', ''],
    ...review.rationale.map((x, i) => [`Rationale ${i + 1}`, x]),
    ['', ''],
    ['Important', 'Round 6 is planning-only. No R6 result is simulated.']
  ];
}

function matrixRows(matrix) {
  const header = matrix.columns.map(([, label]) => label);
  const body = matrix.rows.map(row => matrix.columns.map(([key]) => {
    const value = row[key];
    return value === undefined || value === null ? '' : value;
  }));
  return [
    [matrix.title],
    [matrix.subtitle],
    [],
    header,
    ...body
  ];
}

export function exportWorkbookExcel(state) {
  const book = XLSX.utils.book_new();
  const user = userCompany(state);
  const strategy = strategyAlignment(state);

  addSheet(book, 'Summary', [
    ['MBS Practice Simulator Workbook Export'],
    ['Team', state.teamName],
    ['Mode', state.mode],
    ['Current Round', state.currentRound],
    ['Strategy Goal', strategy.goal.label],
    ['Strategy Alignment', strategy.score],
    ['Practice NPV', user.npv],
    ['Net Profit', user.netProfit],
    ['Market Share', user.marketShare],
    ['ROE', user.roe],
    ['Profit Margin', user.profitMargin],
    ['Current Ratio', user.currentRatio],
    ['Cash', user.cash],
    ['Overdraft', user.overdraft],
    ['Unit Cost', user.unitCost],
    ['Price', user.price],
    [],
    ['Model Boundary', 'Practice NPV, Balanced Score, demand response, and undisclosed formulas remain training approximations.']
  ], [24, 70]);

  addSheet(book, 'Round History', roundRows(state), Array(35).fill(18));

  addSheet(book, 'Strategy Alignment', [
    ['Selected Goal', strategy.goal.label],
    ['Description', strategy.goal.description],
    ['Alignment Score', strategy.score],
    [],
    ['Signal', 'Score'],
    ...Object.entries(strategy.signals).map(([k, v]) => [k, v]),
    [],
    ['Priorities', ''],
    ...strategy.priorities.map((x, i) => [i + 1, x]),
    [],
    ['Guardrails', ''],
    ...strategy.guardrails.map((x, i) => [i + 1, x])
  ], [24, 80]);

  for (const matrix of decisionMatrices(state)) {
    addSheet(book, matrix.title.replace(' Matrix', ''), matrixRows(matrix), Array(matrix.columns.length).fill(18));
  }

  addSheet(book, 'R6 Plan', r6PlanRows(state), [28, 90]);

  const fileName = `mbs-workbook-${String(state.teamName || 'team').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-r${state.currentRound}.xlsx`;
  XLSX.writeFile(book, fileName, { compression: true });
}
