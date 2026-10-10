import { WORKBOOK_PLAN_ROUND, WORKBOOK_RESULT_ROUNDS } from './config.js';
import { userCompany } from './state.js';

function pctMove(a, b) {
  if (!b) return 0;
  return (a - b) / Math.abs(b);
}

function fmt(n) {
  return Math.round(Number(n || 0)).toLocaleString('en-US');
}

export function workbookStage(state) {
  const inWorkbook = state.mode === 'workbook';
  const resultsComplete = inWorkbook && state.currentRound >= WORKBOOK_RESULT_ROUNDS;
  const planFinalized = Boolean(state.workbookPlan?.finalizedAt);
  return {
    inWorkbook,
    resultsComplete,
    planFinalized,
    resultRound: Math.min(state.currentRound, WORKBOOK_RESULT_ROUNDS),
    planRound: WORKBOOK_PLAN_ROUND
  };
}

export function buildRound6Review(state) {
  const user = userCompany(state);
  const history = (user.history || []).filter(item => item.round <= WORKBOOK_RESULT_ROUNDS);
  const first = history[0] || {};
  const latest = history.at(-1) || first;
  const observations = [];
  const rationale = [];

  if (history.length < WORKBOOK_RESULT_ROUNDS + 1) {
    observations.push(`Workbook history belum lengkap: hasil tersedia sampai Round ${state.currentRound}; target review adalah Round 0–5.`);
  } else {
    observations.push('Round 0–5 history lengkap dan siap dipakai sebagai controlling evidence.');
  }

  const shareMove = ((latest.marketShare || 0) - (first.marketShare || 0)) * 100;
  const salesMove = pctMove(latest.sales || 0, first.sales || 0) * 100;
  const profitMove = pctMove(latest.netProfit || 0, first.netProfit || 0) * 100;
  observations.push(`Market share berubah ${shareMove >= 0 ? '+' : ''}${shareMove.toFixed(2)} percentage point dari R0 ke R5/latest.`);
  observations.push(`Sales berubah ${salesMove >= 0 ? '+' : ''}${salesMove.toFixed(1)}%; net profit berubah ${profitMove >= 0 ? '+' : ''}${profitMove.toFixed(1)}% dari baseline.`);

  if ((latest.potentialDemand || 0) > (latest.sales || 0) * 1.10) {
    rationale.push('Production plan harus mempertimbangkan unserved demand, tetapi tetap dibatasi beginning raw material dan overtime ceiling.');
  }
  if ((latest.unitCost || 0) > Number(state.draft?.price || latest.price || 0)) {
    rationale.push('Price R6 perlu memiliki thesis pemulihan margin karena current unit cost masih di atas selling price draft.');
  }
  if ((latest.overdraft || 0) > 0) {
    rationale.push('Dividend dan CAPEX R6 perlu konservatif karena overdraft masih aktif.');
  }
  if ((latest.finishedGoods || 0) > (latest.sales || 0) * 0.25) {
    rationale.push('Production R6 sebaiknya tidak agresif tanpa alasan demand yang kuat karena finished-goods inventory relatif tinggi.');
  }
  if ((latest.rawMaterial || 0) < Number(state.draft?.production || 0) * 1.43) {
    rationale.push('Beginning raw material belum cukup untuk mendukung production request R6 secara penuh; procurement R6 baru tersedia setelah ronde tersebut.');
  }
  if ((latest.capacity || 0) * 1.5 < Number(state.draft?.production || 0)) {
    rationale.push('Production request R6 melebihi overtime ceiling; equipment investment hanya relevan untuk kapasitas periode berikutnya.');
  }
  if (!rationale.length) {
    rationale.push('Draft R6 tidak menunjukkan kontradiksi operasi/likuiditas yang ekstrem berdasarkan indikator terakhir.');
  }

  const decision = state.workbookPlan?.decision || state.draft || {};
  const decisionSummary = [
    ['Price', decision.price],
    ['Marketing', decision.marketing],
    ['R&D', decision.rd],
    ['Production', decision.production],
    ['Procurement', decision.materialPurchase],
    ['Maintenance', decision.maintenance],
    ['Equipment', decision.equipment],
    ['Dividend', decision.dividend]
  ];

  return {
    observations,
    rationale,
    decisionSummary,
    latest,
    historyCount: history.length,
    ready: state.currentRound >= WORKBOOK_RESULT_ROUNDS
  };
}

export function buildWorkbookPlanMarkdown(state) {
  const review = buildRound6Review(state);
  const plan = state.workbookPlan || {};
  const decision = plan.decision || state.draft || {};
  const lines = [
    `# Workbook Round 6 Business Plan — ${state.teamName}`,
    '',
    '> Round 6 is planning-only in the Student Workbook exercise. No Round 6 result is simulated.',
    '',
    '## R0–R5 Review',
    ...review.observations.map(item => `- ${item}`),
    '',
    '## Round 6 Decisions',
    `- Price: ${decision.price ?? 0}`,
    `- Marketing: ${fmt(decision.marketing)}`,
    `- R&D: ${fmt(decision.rd)}`,
    `- Production Request: ${fmt(decision.production)}`,
    `- Raw Material Procurement: ${fmt(decision.materialPurchase)}`,
    `- Maintenance: ${fmt(decision.maintenance)}`,
    `- Equipment Investment: ${fmt(decision.equipment)}`,
    `- Dividend: ${fmt(decision.dividend)}`,
    '',
    '## Planning Rationale',
    ...review.rationale.map(item => `- ${item}`),
    '',
    `Finalized: ${plan.finalizedAt || 'Draft only'}`,
    '',
    '> This file records a management plan only. It intentionally contains no fabricated Round 6 revenue, profit, sales, share, or financial results.'
  ];
  return lines.join('\n');
}
