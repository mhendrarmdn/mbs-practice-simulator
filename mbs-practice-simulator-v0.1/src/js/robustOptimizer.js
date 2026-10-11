import { OPTIMIZER_RISK_PROFILES } from './config.js';
import { simulateRound } from './simulator.js';
import { strategyAlignment } from './strategySystem.js';
import { userCompany } from './state.js';
import { clamp, deepClone } from './utils.js';

const SCENARIOS = [
  ['baseline', 'Controlled Baseline'],
  ['demandBoom', 'Demand Boom'],
  ['slowdown', 'Economic Slowdown'],
  ['rawShock', 'Raw Material Shock'],
  ['equipmentDisruption', 'Equipment Disruption']
];

let optimizerCacheKey = '';
let optimizerCacheValue = null;

function analysisSignature(state, riskProfile) {
  const companies = (state.companies || []).map(company => [
    company.id,
    company.price,
    company.quality,
    company.image,
    company.potentialDemand,
    company.sales,
    company.capacity,
    company.rawMaterial,
    company.finishedGoods,
    company.unitCost,
    company.netProfit,
    company.cash,
    company.overdraft,
    company.npv
  ]);
  return JSON.stringify([
    state.currentRound,
    state.maxRounds,
    state.mode,
    state.logicCalibrationProfile,
    state.adaptiveCalibration,
    state.official?.actuals,
    state.official?.predictions,
    state.strategyGoal,
    riskProfile,
    state.draft,
    companies
  ]);
}

function scenarioClone(state, scenarioKey, decision) {
  const clone = deepClone(state);
  clone.mode = 'sandbox';
  clone.scenarioPreset = scenarioKey;
  clone.surpriseMode = false;
  clone.roomCode = '';
  clone.roomKey = '';
  clone.roomMembers = [];
  clone.decisionLocked = false;
  clone.lockReason = '';
  clone.roundDeadlineAt = null;
  clone.draft = deepClone(decision);
  return clone;
}

const roundStep = (value, step) => Math.max(0, Math.round(Number(value || 0) / step) * step);
const priceStep = value => Math.max(3, Math.round(Number(value || 0) * 20) / 20);

function mutate(base, patch = {}) {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    next[key] = key === 'price' ? priceStep(value) : roundStep(value, key === 'production' ? 1000 : 10000);
  }
  return next;
}

function candidateSet(state) {
  const d = state.draft || {};
  const user = userCompany(state);
  const demandGap = Math.max(0, Number(user.potentialDemand || 0) - Number(user.sales || 0));
  const capNeed = demandGap > Math.max(50000, Number(user.sales || 0) * 0.12);
  const base = {
    price: Number(d.price || user.price || 6.4),
    marketing: Number(d.marketing || 0),
    rd: Number(d.rd || 0),
    production: Number(d.production || 0),
    materialPurchase: Number(d.materialPurchase || 0),
    equipment: Number(d.equipment || 0),
    maintenance: Number(d.maintenance || 0),
    dividend: Number(d.dividend || 0)
  };

  const recipes = [
    ['Current Draft', base],
    ['Margin Recovery', mutate(base, {
      price: base.price * 1.05,
      marketing: base.marketing * 0.90,
      rd: base.rd * 0.90,
      production: base.production * 0.95,
      materialPurchase: base.materialPurchase * 0.90,
      equipment: 0,
      dividend: 0
    })],
    ['Liquidity Shield', mutate(base, {
      marketing: base.marketing * 0.78,
      rd: base.rd * 0.75,
      production: base.production * 0.90,
      materialPurchase: base.materialPurchase * 0.80,
      equipment: 0,
      maintenance: Math.min(base.maintenance, 280000),
      dividend: 0
    })],
    ['Share Capture', mutate(base, {
      price: base.price * 0.97,
      marketing: base.marketing * 1.25,
      rd: base.rd * 1.15,
      production: base.production * 1.15,
      materialPurchase: base.materialPurchase * 1.15,
      equipment: capNeed ? Math.max(base.equipment, 300000) : base.equipment
    })],
    ['Supply Capture', mutate(base, {
      production: base.production * 1.22,
      materialPurchase: base.materialPurchase * 1.20,
      equipment: capNeed ? Math.max(base.equipment, 350000) : Math.max(base.equipment, 150000),
      maintenance: Math.max(base.maintenance, 280000)
    })],
    ['Premium Push', mutate(base, {
      price: base.price * 1.07,
      marketing: base.marketing * 1.15,
      rd: base.rd * 1.30,
      production: base.production * 1.02,
      materialPurchase: base.materialPurchase
    })],
    ['Lean Operator', mutate(base, {
      price: base.price * 1.01,
      marketing: base.marketing * 0.82,
      rd: base.rd * 0.82,
      production: base.production * 0.94,
      materialPurchase: base.materialPurchase * 0.88,
      equipment: 0,
      maintenance: Math.max(220000, base.maintenance * 0.90),
      dividend: 0
    })],
    ['Balanced +10%', mutate(base, {
      marketing: base.marketing * 1.10,
      rd: base.rd * 1.10,
      production: base.production * 1.10,
      materialPurchase: base.materialPurchase * 1.10,
      maintenance: base.maintenance * 1.05
    })],
    ['Balanced -10%', mutate(base, {
      marketing: base.marketing * 0.90,
      rd: base.rd * 0.90,
      production: base.production * 0.90,
      materialPurchase: base.materialPurchase * 0.90,
      maintenance: base.maintenance * 0.95
    })],
    ['Price +3%', mutate(base, { price: base.price * 1.03 })],
    ['Price -3%', mutate(base, { price: base.price * 0.97 })],
    ['Marketing +20%', mutate(base, { marketing: base.marketing * 1.20 })],
    ['R&D +20%', mutate(base, { rd: base.rd * 1.20 })],
    ['Production +15%', mutate(base, { production: base.production * 1.15, materialPurchase: base.materialPurchase * 1.10 })],
    ['Production -15%', mutate(base, { production: base.production * 0.85, materialPurchase: base.materialPurchase * 0.90 })],
    ['No CAPEX', mutate(base, { equipment: 0 })],
    ['No Dividend', mutate(base, { dividend: 0 })],
    ['Maintenance 280k', mutate(base, { maintenance: 280000 })]
  ];

  const seen = new Set();
  const unique = recipes.filter(([, decision]) => {
    const key = JSON.stringify(decision);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // With the v1.3+ 16-company field, evaluating every micro-variant synchronously
  // makes the first Optimizer render unnecessarily heavy. Keep the most decision-
  // distinct candidates while preserving the core strategic alternatives.
  const limit = (state.companies || []).length >= 16 ? 12 : unique.length;
  return unique.slice(0, limit).map(([name, decision], index) => ({ id: index, name, decision }));
}

function normalize(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  if (max <= min) return 50;
  return clamp((value - min) / (max - min) * 100, 0, 100);
}

function stddev(values) {
  if (!values.length) return 0;
  const avg = values.reduce((a,b)=>a+b,0) / values.length;
  return Math.sqrt(values.reduce((s,v)=>s + Math.pow(v-avg,2),0) / values.length);
}

export function robustOptimize(state, riskProfile = state.optimizerRisk || 'balanced') {
  if (state.currentRound >= state.maxRounds) {
    return {
      available: false,
      reason: state.mode === 'workbook'
        ? 'Workbook R6 is planning-only, so the optimizer will not fabricate an R6 simulated result.'
        : 'No remaining result round to optimize.',
      candidates: [],
      scenarios: SCENARIOS,
      errors: []
    };
  }

  const profile = OPTIMIZER_RISK_PROFILES[riskProfile] ? riskProfile : 'balanced';
  const cacheKey = analysisSignature(state, profile);
  if (cacheKey === optimizerCacheKey && optimizerCacheValue) return optimizerCacheValue;

  const candidates = candidateSet(state);
  const baseUser = userCompany(state);
  const allOutcomes = [];
  const errors = [];

  for (const candidate of candidates) {
    const outcomes = [];

    for (const [scenarioKey, scenarioLabel] of SCENARIOS) {
      try {
        const clone = scenarioClone(state, scenarioKey, candidate.decision);
        simulateRound(clone);
        const user = userCompany(clone);
        if (!user || !Number.isFinite(Number(user.npv))) {
          throw new Error('Scenario produced an invalid user result.');
        }

        let alignmentScore = 50;
        try {
          const alignment = strategyAlignment(clone, state.strategyGoal || 'balancedValue');
          alignmentScore = Number.isFinite(Number(alignment?.score)) ? Number(alignment.score) : 50;
        } catch (alignmentError) {
          console.warn('Optimizer alignment fallback:', alignmentError);
        }

        const outcome = {
          scenarioKey,
          scenarioLabel,
          npv: Number(user.npv || 0),
          npvDelta: Number(user.npv || 0) - Number(baseUser?.npv || 0),
          netProfit: Number(user.netProfit || 0),
          cash: Number(user.cash || 0),
          overdraft: Number(user.overdraft || 0),
          marketShare: Number(user.marketShare || 0),
          unitCost: Number(user.unitCost || 0),
          alignment: alignmentScore
        };
        outcomes.push(outcome);
        allOutcomes.push(outcome);
      } catch (error) {
        console.error('Optimizer scenario failed:', candidate.name, scenarioKey, error);
        errors.push({
          candidate: candidate.name,
          scenarioKey,
          scenarioLabel,
          message: error?.message || String(error)
        });
      }
    }

    candidate.outcomes = outcomes;
  }

  const validCandidates = candidates.filter(candidate => candidate.outcomes.length > 0);
  if (!allOutcomes.length || !validCandidates.length) {
    const result = {
      available: false,
      reason: errors[0]?.message || 'Optimizer scenario engine gagal menghasilkan outcome yang valid.',
      candidates: [],
      scenarios: SCENARIOS,
      errors
    };
    optimizerCacheKey = cacheKey;
    optimizerCacheValue = result;
    return result;
  }

  const npvValues = allOutcomes.map(x=>x.npvDelta).filter(Number.isFinite);
  const profitValues = allOutcomes.map(x=>x.netProfit).filter(Number.isFinite);
  const shareValues = allOutcomes.map(x=>x.marketShare).filter(Number.isFinite);
  const npvMin = Math.min(...npvValues), npvMax = Math.max(...npvValues);
  const profitMin = Math.min(...profitValues), profitMax = Math.max(...profitValues);
  const shareMin = Math.min(...shareValues), shareMax = Math.max(...shareValues);

  for (const candidate of validCandidates) {
    const os = candidate.outcomes;
    const avg = fn => os.reduce((s,x)=>s+Number(fn(x)||0),0) / Math.max(os.length,1);
    const avgAlignment = avg(x=>x.alignment);
    const avgNpvNorm = avg(x=>normalize(x.npvDelta,npvMin,npvMax));
    const avgProfitNorm = avg(x=>normalize(x.netProfit,profitMin,profitMax));
    const avgShareNorm = avg(x=>normalize(x.marketShare,shareMin,shareMax));
    const worstNpvNorm = Math.min(...os.map(x=>normalize(x.npvDelta,npvMin,npvMax)));
    const overdraftRate = os.filter(x=>x.overdraft>0).length / Math.max(os.length,1);
    const liquiditySafety = clamp(100 - overdraftRate*70 - avg(x=>Math.min(x.overdraft/20000,30)),0,100);
    const volatility = stddev(os.map(x=>normalize(x.npvDelta,npvMin,npvMax)));
    const avgNpvDelta = avg(x=>x.npvDelta);
    const worstNpvDelta = Math.min(...os.map(x=>x.npvDelta));

    let robustScore;
    if (profile === 'conservative') {
      robustScore = avgAlignment*0.30 + avgNpvNorm*0.20 + worstNpvNorm*0.25 + liquiditySafety*0.20 + (100-volatility)*0.05;
    } else if (profile === 'aggressive') {
      robustScore = avgAlignment*0.30 + avgNpvNorm*0.40 + avgShareNorm*0.15 + avgProfitNorm*0.10 + worstNpvNorm*0.05;
    } else {
      robustScore = avgAlignment*0.32 + avgNpvNorm*0.30 + worstNpvNorm*0.13 + liquiditySafety*0.15 + avgProfitNorm*0.10;
    }

    Object.assign(candidate, {
      robustScore: clamp(Math.round(Number.isFinite(robustScore) ? robustScore : 0),0,100),
      avgAlignment: Math.round(avgAlignment),
      avgNpvDelta,
      worstNpvDelta,
      liquiditySafety: Math.round(liquiditySafety),
      volatility: Math.round(volatility),
      avgShare: avg(x=>x.marketShare),
      avgProfit: avg(x=>x.netProfit)
    });
  }

  validCandidates.sort((a,b)=>b.robustScore-a.robustScore);
  const current = validCandidates.find(x=>x.name==='Current Draft') || validCandidates[0];
  const best = validCandidates[0];

  const result = {
    available: true,
    riskProfile: profile,
    profile: OPTIMIZER_RISK_PROFILES[profile],
    scenarios: SCENARIOS,
    candidates: validCandidates,
    best,
    current,
    improvement: best.robustScore - current.robustScore,
    partial: errors.length > 0,
    errors,
    disclaimer: 'Robust Optimizer ranks candidate drafts inside the independent training model. It is not an official TopBoss optimizer and cannot guarantee actual competition results.'
  };

  optimizerCacheKey = cacheKey;
  optimizerCacheValue = result;
  return result;
}

export function buildOptimizerMarkdown(state, riskProfile = state.optimizerRisk || 'balanced') {
  const result = robustOptimize(state, riskProfile);
  if (!result.available) return '# Robust Optimizer\n\nNo remaining round available.';
  const d = result.best.decision;
  return [
    `# Robust Optimizer Brief — ${state.teamName}`,
    '',
    `Risk Profile: ${result.profile.label}`,
    `Selected Strategy Goal: ${state.strategyGoal}`,
    `Recommended Candidate: ${result.best.name}`,
    `Robust Score: ${result.best.robustScore}/100`,
    `Improvement vs Current Draft: ${result.improvement >= 0 ? '+' : ''}${result.improvement} points`,
    '',
    '## Recommended Decision',
    `- Price: ${d.price}`,
    `- Marketing: ${d.marketing}`,
    `- R&D: ${d.rd}`,
    `- Production: ${d.production}`,
    `- Procurement: ${d.materialPurchase}`,
    `- Equipment: ${d.equipment}`,
    `- Maintenance: ${d.maintenance}`,
    `- Dividend: ${d.dividend}`,
    '',
    '## Robustness',
    `- Average Strategy Alignment: ${result.best.avgAlignment}/100`,
    `- Average Practice NPV Delta: ${Math.round(result.best.avgNpvDelta).toLocaleString('en-US')}`,
    `- Worst Practice NPV Delta: ${Math.round(result.best.worstNpvDelta).toLocaleString('en-US')}`,
    `- Liquidity Safety: ${result.best.liquiditySafety}/100`,
    `- Scenario Volatility: ${result.best.volatility}`,
    '',
    '## Scenario Outcomes',
    ...result.best.outcomes.map(x=>`- ${x.scenarioLabel}: profit ${Math.round(x.netProfit).toLocaleString('en-US')}, NPV Δ ${Math.round(x.npvDelta).toLocaleString('en-US')}, overdraft ${Math.round(x.overdraft).toLocaleString('en-US')}, alignment ${x.alignment}/100`),
    '',
    `> ${result.disclaimer}`
  ].join('\n');
}
