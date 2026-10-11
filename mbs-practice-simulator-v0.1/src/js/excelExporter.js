import * as XLSX from 'xlsx';
import { decisionMatrices } from './decisionMatrix.js';
import { buildRound6Review } from './workbookLab.js';
import { strategyAlignment } from './strategySystem.js';
import { userCompany } from './state.js';
import { availableFinancialRounds, financialForRound } from './financialStatement.js';
import { reconciliationForRound } from './officialSync.js';

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


function financialRows(state, section) {
  return availableFinancialRounds(state).map(round => {
    const data = financialForRound(state, round);
    const f = data?.statement?.[section] || {};
    return { Round: `R${round}`, Source: data?.isOfficial ? 'Official TopBoss' : (data?.source || 'Practice'), ...f };
  });
}

function officialEnvironmentRows(state) {
  return Object.entries(state.official?.environments || {})
    .sort(([a],[b])=>Number(a)-Number(b))
    .map(([round,value])=>({ Round:`R${round}`, ...value }));
}

function officialActualRows(state) {
  return Object.entries(state.official?.actuals || {})
    .sort(([a],[b])=>Number(a)-Number(b))
    .map(([round,entry])=>({ Round:`R${round}`, Source:entry?.source || '', SavedAt:entry?.savedAt || '', ...(entry?.values || {}) }));
}

function reconciliationRows(state) {
  const rounds = Object.keys(state.official?.actuals || {}).map(Number).sort((a,b)=>a-b);
  return rounds.flatMap(round => reconciliationForRound(state, round).map(item => ({
    Round:`R${round}`,
    Metric:item.key,
    Predicted:item.predicted,
    'Official Actual':item.actual,
    Difference:item.diff,
    'Error %':item.pctError
  })));
}

function officialOcrRows(state) {
  return Object.entries(state.official?.ocr || {})
    .sort(([a],[b])=>Number(a)-Number(b))
    .map(([round,item])=>({
      Round:`R${round}`,
      Confidence:item?.confidence ?? '',
      Files:item?.files ?? 0,
      'Detected Fields':item?.detected ?? 0,
      'Page Types':(item?.pageTypes || []).join(', '),
      Reviewed:item?.reviewed ? 'YES' : 'NO',
      ExtractedAt:item?.extractedAt || ''
    }));
}

function evidenceRows(state) {
  return Object.entries(state.official?.evidence || {})
    .sort(([a],[b])=>Number(a)-Number(b))
    .flatMap(([round,raw]) => (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(item => ({
      Round:`R${round}`,
      File:item?.name || '',
      Type:item?.type || '',
      Size:item?.size || 0,
      PageType:item?.pageType || '',
      Confidence:item?.confidence ?? '',
      AddedAt:item?.addedAt || ''
    })));
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
  addSheet(book, 'Balance Sheet', financialRows(state, 'balanceSheet'), Array(14).fill(20));
  addSheet(book, 'Cash Flow', financialRows(state, 'cashFlow'), Array(14).fill(20));
  addSheet(book, 'Income Statement', financialRows(state, 'incomeStatement'), Array(18).fill(20));
  addSheet(book, 'Financial Ratios', financialRows(state, 'ratios'), Array(16).fill(20));
  addSheet(book, 'Official Environment', officialEnvironmentRows(state), Array(14).fill(20));
  addSheet(book, 'Official Actuals', officialActualRows(state), Array(22).fill(20));
  addSheet(book, 'Reconciliation', reconciliationRows(state), [10,22,18,18,18,14]);
  addSheet(book, 'OCR Audit', officialOcrRows(state), [10,14,10,16,30,12,24]);
  addSheet(book, 'Evidence Log', evidenceRows(state), [10,32,18,14,18,14,24]);

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
