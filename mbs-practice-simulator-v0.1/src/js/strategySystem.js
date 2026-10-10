import { STRATEGY_GOALS } from './config.js';
import { draftReadiness } from './decisionIntel.js';
import { userCompany } from './state.js';
import { clamp } from './utils.js';

const score01 = value => clamp(Number(value || 0), 0, 1);
const scale = (value, min, max) => clamp((Number(value || 0) - min) / Math.max(max - min, 1e-9), 0, 1) * 100;

function coreSignals(state) {
  const user = userCompany(state);
  const d = state.draft || {};
  const readiness = draftReadiness(state);
  const currentRatio = Number(user.currentRatio || 0);
  const margin = Number(user.profitMargin || 0);
  const roe = Number(user.roe || 0);
  const spread = Number(d.price || user.price || 0) - Number(user.unitCost || 0);
  const share = Number(user.marketShare || 0);
  const unserved = Math.max(0, Number(user.potentialDemand || 0) - Number(user.sales || 0));
  const demandGapRatio = unserved / Math.max(Number(user.potentialDemand || 1), 1);
  const utilization = Number(user.production || 0) / Math.max(Number(user.capacity || 1), 1);
  const marketingIntensity = Number(d.marketing || 0) / 300000;
  const rdIntensity = Number(d.rd || 0) / 350000;
  const equipmentIntensity = Number(d.equipment || 0) / 400000;
  const discretionary =
    Number(d.marketing || 0) + Number(d.rd || 0) + Number(d.equipment || 0) +
    Number(d.maintenance || 0) + Number(d.dividend || 0);
  const liquidityBase = currentRatio >= 1.5 ? 100 : scale(currentRatio, 0.5, 1.5);
  const overdraftPenalty = Math.min(100, Number(user.overdraft || 0) / 10000);
  const liquidity = clamp(liquidityBase - overdraftPenalty * 0.55, 0, 100);
  const profit = clamp(
    scale(margin, -0.20, 0.15) * 0.45 +
    scale(roe, -0.15, 0.12) * 0.30 +
    scale(spread, -2, 2) * 0.25,
    0, 100
  );
  const market = clamp(
    scale(share, 0.04, 0.14) * 0.45 +
    score01(marketingIntensity) * 100 * 0.20 +
    score01(rdIntensity) * 100 * 0.15 +
    clamp(100 - demandGapRatio * 120, 0, 100) * 0.20,
    0, 100
  );
  const capacity = clamp(
    clamp(demandGapRatio * 140, 0, 100) * 0.30 +
    scale(utilization, 0.65, 1.10) * 0.20 +
    score01(equipmentIntensity) * 100 * 0.20 +
    clamp(readiness.demandCoverage * 75, 0, 100) * 0.30,
    0, 100
  );
  const premium = clamp(
    scale(user.quality, 0.20, 0.60) * 0.30 +
    scale(user.image, 0.40, 0.80) * 0.30 +
    score01(marketingIntensity) * 100 * 0.15 +
    score01(rdIntensity) * 100 * 0.15 +
    scale(d.price || user.price, 5.5, 8.5) * 0.10,
    0, 100
  );
  const spendingDiscipline = clamp(100 - scale(discretionary, 500000, 1800000), 0, 100);

  return {
    user, d, readiness, currentRatio, margin, roe, spread, share, unserved,
    demandGapRatio, utilization, liquidity, profit, market, capacity, premium,
    spendingDiscipline
  };
}

function goalScore(goal, s) {
  switch (goal) {
    case 'profitability':
      return s.profit * 0.55 + s.liquidity * 0.15 + s.spendingDiscipline * 0.15 + s.readiness.score * 0.15;
    case 'marketLeadership':
      return s.market * 0.55 + s.capacity * 0.20 + s.premium * 0.10 + s.readiness.score * 0.15;
    case 'liquidityDefense':
      return s.liquidity * 0.60 + s.spendingDiscipline * 0.20 + s.profit * 0.10 + s.readiness.score * 0.10;
    case 'capacityGrowth':
      return s.capacity * 0.55 + s.liquidity * 0.15 + s.market * 0.15 + s.readiness.score * 0.15;
    case 'premiumBrand':
      return s.premium * 0.55 + s.profit * 0.15 + s.market * 0.15 + s.readiness.score * 0.15;
    default:
      return s.profit * 0.25 + s.liquidity * 0.25 + s.market * 0.20 + s.capacity * 0.10 + s.premium * 0.05 + s.readiness.score * 0.15;
  }
}

function guidance(goal, s) {
  const priorities = [];
  const guardrails = [];

  if (goal === 'profitability') {
    if (s.spread <= 0) priorities.push('Pulihkan price–unit cost spread sebelum mengejar volume.');
    if (s.margin < 0.08) priorities.push('Prioritaskan margin expansion dan cost discipline.');
    if (s.spendingDiscipline < 55) priorities.push('Review marketing/R&D/CAPEX yang belum punya payback thesis jelas.');
    guardrails.push('Jangan membeli market share dengan economics negatif.');
    guardrails.push('Dividend hanya layak jika liquidity dan earnings sudah memadai.');
  } else if (goal === 'marketLeadership') {
    if (s.demandGapRatio > 0.10) priorities.push('Tutup supply gap agar demand potensial dapat dikonversi menjadi sales.');
    if (s.market < 70) priorities.push('Perkuat marketing/R&D sambil menjaga price competitiveness.');
    if (s.capacity < 60) priorities.push('Siapkan capacity/RM untuk mendukung pertumbuhan share.');
    guardrails.push('Growth harus menghasilkan sales dan value, bukan sekadar spending.');
    guardrails.push('Share gain dengan overdraft ekstrem harus memiliki recovery plan.');
  } else if (goal === 'liquidityDefense') {
    if (s.user.overdraft > 0) priorities.push('Prioritas pertama: kurangi overdraft dan kebutuhan pembiayaan.');
    if (Number(s.d.dividend || 0) > 0) priorities.push('Tahan dividend sampai liquidity pulih.');
    if (Number(s.d.equipment || 0) > 0) priorities.push('Tunda CAPEX yang payoff-nya belum mendesak.');
    guardrails.push('Cash survival lebih penting daripada aggressive expansion.');
    guardrails.push('Procurement berlebih dapat mengunci working capital di inventory.');
  } else if (goal === 'capacityGrowth') {
    if (s.demandGapRatio > 0.10) priorities.push('Gunakan demand gap sebagai dasar equipment/production planning.');
    if (s.utilization > 0.95) priorities.push('Capacity utilization tinggi; siapkan next-capacity sebelum bottleneck membesar.');
    if (s.readiness.demandCoverage < 0.95) priorities.push('Sinkronkan production dan beginning RM dengan target demand.');
    guardrails.push('Equipment menghasilkan next-round capacity; jangan overinvest dekat horizon akhir.');
    guardrails.push('Procurement ronde ini baru tersedia di akhir ronde.');
  } else if (goal === 'premiumBrand') {
    if (s.premium < 70) priorities.push('Naikkan quality/image melalui R&D dan marketing yang terukur.');
    if (s.spread <= 0) priorities.push('Premium positioning membutuhkan pricing power yang tetap menghasilkan margin.');
    if (s.demandGapRatio > 0.10) priorities.push('Pastikan premium demand dapat dilayani oleh supply.');
    guardrails.push('Jangan menaikkan price tanpa quality/image support.');
    guardrails.push('Brand investment harus dibaca bersama sales conversion dan margin.');
  } else {
    if (s.readiness.score < 80) priorities.push('Selesaikan warning Decision Readiness sebelum submit.');
    if (s.user.overdraft > 0) priorities.push('Pulihkan liquidity tanpa mematikan growth driver yang produktif.');
    if (s.spread <= 0) priorities.push('Perbaiki unit economics.');
    if (s.demandGapRatio > 0.10) priorities.push('Kurangi unserved demand melalui supply/capacity discipline.');
    guardrails.push('Tidak ada satu KPI yang boleh menang dengan menghancurkan NPV, cash, dan sustainability operasi.');
    guardrails.push('Jaga keseimbangan growth, profitability, dan liquidity.');
  }

  if (!priorities.length) priorities.push('Draft relatif konsisten dengan objective saat ini; fokus pada execution dan downside protection.');
  return { priorities: priorities.slice(0,4), guardrails: guardrails.slice(0,4) };
}

export function strategyAlignment(state, goalKey = state.strategyGoal || 'balancedValue') {
  const goal = STRATEGY_GOALS[goalKey] || STRATEGY_GOALS.balancedValue;
  const s = coreSignals(state);
  const score = clamp(Math.round(goalScore(goalKey, s)), 0, 100);
  const notes = guidance(goalKey, s);

  return {
    goalKey,
    goal,
    score,
    signals: {
      profitability: Math.round(s.profit),
      liquidity: Math.round(s.liquidity),
      market: Math.round(s.market),
      capacity: Math.round(s.capacity),
      premium: Math.round(s.premium),
      readiness: Math.round(s.readiness.score)
    },
    priorities: notes.priorities,
    guardrails: notes.guardrails
  };
}

export function strategyComparison(state) {
  return Object.keys(STRATEGY_GOALS)
    .map(key => strategyAlignment(state, key))
    .sort((a,b) => b.score - a.score);
}
