import { deepClone } from './utils.js';
import { simulateRound } from './simulator.js';
import { draftReadiness, roundDebrief } from './decisionIntel.js';
import { userCompany } from './state.js';

const STRESS_PRESETS = [
  ['baseline', 'Controlled Baseline'],
  ['demandBoom', 'Demand Boom'],
  ['slowdown', 'Economic Slowdown'],
  ['rawShock', 'Raw Material Shock'],
  ['equipmentDisruption', 'Equipment Disruption']
];

let stressCacheKey = '';
let stressCacheValue = null;

function analysisSignature(state, suffix = '') {
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
    state.strategyGoal,
    state.draft,
    companies,
    suffix
  ]);
}

function scenarioClone(state, scenarioKey) {
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
  // Analysis pages should use the calibrated coefficient set, but never the controlled
  // Workbook-R1 replay environment. Setting sandbox mode above prevents that demand replay.
  return clone;
}

function cumulative(history, selector) {
  return (history || []).filter(item => item.round > 0).reduce((sum, item) => sum + Number(selector(item) || 0), 0);
}

export function competitionSnapshot(state) {
  const user = userCompany(state);
  const sorted = [...state.companies].sort((a, b) => b.npv - a.npv);
  const rank = sorted.findIndex(company => company.isUser) + 1;
  const leader = sorted[0];
  const history = user.history || [];
  const roundsRemaining = Math.max(0, state.maxRounds - state.currentRound);
  const cumulativeProfit = cumulative(history, item => item.netProfit);
  const cumulativeDividend = cumulative(history, item => item.decision?.dividend);
  const cumulativeRevenue = cumulative(history, item => item.revenue);
  const bestRound = history.filter(item => item.round > 0).sort((a,b)=>b.netProfit-a.netProfit)[0] || null;

  return {
    rank,
    competitors: sorted.length,
    leaderName: leader?.name || '',
    npvGapToLeader: Math.max(0, Number(leader?.npv || 0) - Number(user.npv || 0)),
    roundsRemaining,
    cumulativeProfit,
    cumulativeDividend,
    cumulativeRevenue,
    bestRound,
    user
  };
}

export function stressTestDraft(state) {
  if (state.currentRound >= state.maxRounds) {
    return { available: false, rows: [], errors: [], reason: 'No remaining result round to stress-test.' };
  }

  const cacheKey = analysisSignature(state, 'competition-stress-v141');
  if (cacheKey === stressCacheKey && stressCacheValue) return stressCacheValue;

  const currentUser = userCompany(state);
  const rows = [];
  const errors = [];

  for (const [key, label] of STRESS_PRESETS) {
    try {
      const clone = scenarioClone(state, key);
      simulateRound(clone);
      const user = userCompany(clone);
      if (!user || !Number.isFinite(Number(user.npv))) {
        throw new Error('Scenario produced an invalid user result.');
      }
      rows.push({
        key,
        label,
        netProfit: Number(user.netProfit || 0),
        cash: Number(user.cash || 0),
        overdraft: Number(user.overdraft || 0),
        marketShare: Number(user.marketShare || 0),
        npv: Number(user.npv || 0),
        npvDelta: Number(user.npv || 0) - Number(currentUser?.npv || 0),
        unitCost: Number(user.unitCost || 0),
        sales: Number(user.sales || 0)
      });
    } catch (error) {
      console.error('Competition stress scenario failed:', key, error);
      errors.push({ key, label, message: error?.message || String(error) });
    }
  }

  const result = rows.length
    ? {
        available: true,
        rows,
        errors,
        partial: errors.length > 0,
        reason: errors.length ? `${errors.length} scenario gagal dihitung; scenario lain tetap ditampilkan.` : ''
      }
    : {
        available: false,
        rows: [],
        errors,
        partial: false,
        reason: errors[0]?.message || 'Scenario stress test gagal dihitung.'
      };

  stressCacheKey = cacheKey;
  stressCacheValue = result;
  return result;
}

export function strategyBrief(state) {
  const snap = competitionSnapshot(state);
  const readiness = draftReadiness(state);
  const debrief = roundDebrief(state);
  const user = snap.user;
  const issues = [];
  const priorities = [];
  const guardrails = [];

  if (user.unitCost > user.price) issues.push('Unit cost masih di atas selling price.');
  if (user.overdraft > 0) issues.push('Overdraft aktif dan menekan fleksibilitas likuiditas.');
  if (user.potentialDemand > user.sales * 1.10) issues.push('Ada unserved demand; operasi belum menangkap seluruh demand potensial.');
  if (user.finishedGoods > user.sales * 0.25) issues.push('Finished goods inventory relatif tinggi terhadap sales.');
  if (!issues.length) issues.push('Tidak ada red flag utama; fokus pada konsistensi NPV, margin, dan liquidity.');

  if (readiness.score < 60) priorities.push('Perbaiki kontradiksi draft sebelum submit; Decision Readiness masih high-risk.');
  else if (readiness.score < 80) priorities.push('Review warning pada draft dan pastikan trade-off sengaja, bukan kebetulan.');
  else priorities.push('Draft relatif siap; fokus pada downside protection sebelum Captain submit.');

  if (user.unitCost > user.price) priorities.push('Pulihkan unit economics melalui price discipline, volume efficiency, atau cost control.');
  if (user.potentialDemand > user.sales * 1.10) priorities.push('Sinkronkan production, beginning raw material, dan next capacity dengan demand.');
  if (user.overdraft > 0) priorities.push('Kurangi cash commitments yang tidak langsung memperbaiki economics.');
  if (snap.roundsRemaining <= 1) priorities.push('Endgame: hindari investasi yang payoff-nya melewati horizon ronde tersisa.');

  guardrails.push('Jangan mengejar market share jika profit dan cash memburuk tanpa thesis pemulihan.');
  guardrails.push('Procurement ronde ini adalah buffer untuk ronde berikutnya, bukan solusi shortage current round.');
  guardrails.push('Maintenance/equipment dinilai sebagai investasi next-round; cek horizon sebelum belanja agresif.');
  if (snap.roundsRemaining <= 1) guardrails.push('Prioritaskan keputusan yang monetisasinya terlihat sebelum game berakhir.');

  return { snap, readiness, debrief, issues: issues.slice(0,4), priorities: priorities.slice(0,5), guardrails };
}

export function presentationBrief(state) {
  const { snap, readiness, debrief, issues, priorities, guardrails } = strategyBrief(state);
  const user = snap.user;
  const history = user.history || [];
  const first = history[0];
  const latest = history.at(-1) || first;
  const pctMove = (a,b) => b ? (a-b)/Math.abs(b) : 0;

  return {
    keyIssues: issues,
    analysis: [
      `Practice NPV rank: #${snap.rank}/${snap.competitors}; gap to leader: ${Math.round(snap.npvGapToLeader).toLocaleString('en-US')}.`,
      `Revenue vs R0: ${(pctMove(latest.revenue, first.revenue)*100).toFixed(1)}%; market share change: ${((latest.marketShare-first.marketShare)*100).toFixed(2)} pp.`,
      `Current margin ${(Number(user.profitMargin||0)*100).toFixed(2)}%, ROE ${(Number(user.roe||0)*100).toFixed(2)}%, current ratio ${Number(user.currentRatio||0).toFixed(2)}x.`,
      debrief.headline
    ],
    evaluation: [
      `Decision Readiness: ${readiness.score}/100.`,
      `Cumulative simulated net profit after submitted rounds: ${Math.round(snap.cumulativeProfit).toLocaleString('en-US')}.`,
      `Cumulative dividend: ${Math.round(snap.cumulativeDividend).toLocaleString('en-US')}.`,
      `Rounds remaining: ${snap.roundsRemaining}.`
    ],
    recommendation: priorities,
    risks: guardrails,
    qa: [
      'Apa bukti bahwa kenaikan market share menghasilkan value, bukan hanya volume?',
      'Jika demand naik, bottleneck pertama ada di raw material, production, atau capacity?',
      'Apa trade-off terbesar antara growth spending dan liquidity pada ronde berikutnya?',
      'Mengapa dividend/CAPEX sekarang lebih baik daripada menunggu ronde berikutnya?',
      'Jika macro shock berlawanan dengan base case, keputusan mana yang paling rentan?'
    ]
  };
}

export function buildCompetitionBriefMarkdown(state) {
  const brief = presentationBrief(state);
  const snap = competitionSnapshot(state);
  const user = snap.user;
  const lines = [
    `# MBS Competition Brief — ${state.teamName}`,
    '',
    `Round: ${state.currentRound}/${state.maxRounds}`,
    `Practice NPV: ${Math.round(user.npv).toLocaleString('en-US')} (Rank #${snap.rank}/${snap.competitors})`,
    `Net Profit: ${Math.round(user.netProfit).toLocaleString('en-US')}`,
    `ROE: ${(Number(user.roe||0)*100).toFixed(2)}%`,
    `Profit Margin: ${(Number(user.profitMargin||0)*100).toFixed(2)}%`,
    `Current Ratio: ${Number(user.currentRatio||0).toFixed(2)}x`,
    `Market Share: ${(user.marketShare*100).toFixed(2)}%`,
    '',
    '## Key Issues',
    ...brief.keyIssues.map(x=>`- ${x}`),
    '',
    '## Analysis',
    ...brief.analysis.map(x=>`- ${x}`),
    '',
    '## Evaluation',
    ...brief.evaluation.map(x=>`- ${x}`),
    '',
    '## Recommendation / Next-Round Priorities',
    ...brief.recommendation.map(x=>`- ${x}`),
    '',
    '## Risk Guardrails',
    ...brief.risks.map(x=>`- ${x}`),
    '',
    '## Q&A Drill',
    ...brief.qa.map(x=>`- ${x}`),
    '',
    '> Practice brief generated from the independent training model. It is not an official TopBoss output.'
  ];
  return lines.join('\n');
}
