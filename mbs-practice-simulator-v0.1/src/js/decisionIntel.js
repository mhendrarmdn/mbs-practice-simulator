import { MATERIAL_PER_UNIT, R1_CALIBRATION, ROUND1_REFERENCE } from './config.js';
import { userCompany } from './state.js';
import { clamp } from './utils.js';

const decisionKeys = ['price','marketing','rd','production','materialPurchase','equipment','maintenance','dividend'];

export function isReferenceDecision(decision = {}) {
  return decisionKeys.every(key => {
    const expected = Number(ROUND1_REFERENCE[key] || 0);
    const actual = Number(decision[key] || 0);
    const tolerance = key === 'price' ? 0.05 : Math.max(1000, Math.abs(expected) * 0.01);
    return Math.abs(actual - expected) <= tolerance;
  });
}

export function draftReadiness(state) {
  const user = userCompany(state);
  const d = state.draft || {};
  const plannedProduction = Math.max(0, Math.min(Number(d.production || 0), Number(user.capacity || 0)));
  const availableFG = Number(user.finishedGoods || 0) + plannedProduction;
  const demand = Math.max(Number(user.potentialDemand || 0), 1);
  const demandCoverage = availableFG / demand;
  const rmAfter = Number(user.rawMaterial || 0) + Number(d.materialPurchase || 0) - plannedProduction * MATERIAL_PER_UNIT;
  const spend = Number(d.marketing || 0) + Number(d.rd || 0) + Number(d.equipment || 0) + Number(d.maintenance || 0) + Number(d.dividend || 0);
  const checks = [];
  let score = 100;

  const add = (severity, title, detail, penalty) => {
    checks.push({ severity, title, detail });
    score -= penalty;
  };

  if (Number(d.price || 0) < Number(user.unitCost || 0)) {
    add('danger', 'Price di bawah current unit cost', 'Margin ronde berikutnya sangat rentan jika cost tidak turun.', 24);
  } else {
    checks.push({ severity: 'good', title: 'Price spread positif', detail: 'Selling price berada di atas current unit cost.' });
  }

  if (demandCoverage < 0.90) {
    add('danger', 'Supply coverage rendah', `FG + planned production hanya menutup ${(demandCoverage * 100).toFixed(0)}% dari current potential demand.`, 22);
  } else if (demandCoverage > 1.35) {
    add('warning', 'Risiko overproduction', `Supply coverage sekitar ${(demandCoverage * 100).toFixed(0)}%; inventory build-up perlu diawasi.`, 10);
  } else {
    checks.push({ severity: 'good', title: 'Supply coverage cukup', detail: `Coverage sekitar ${(demandCoverage * 100).toFixed(0)}% dari current potential demand.` });
  }

  if (rmAfter < 0) {
    add('danger', 'Raw material tidak cukup', 'Production request tidak didukung material yang tersedia + purchase.', 24);
  } else if (rmAfter > Math.max(plannedProduction * MATERIAL_PER_UNIT * 2.2, 1200000)) {
    add('warning', 'Raw material berlebih', 'Working capital berpotensi terlalu banyak tertahan di raw material.', 10);
  } else {
    checks.push({ severity: 'good', title: 'Raw material coverage wajar', detail: 'Material plan masih dalam rentang latihan yang relatif terkendali.' });
  }

  if (Number(d.dividend || 0) > 0 && (Number(user.overdraft || 0) > 0 || Number(user.netProfit || 0) < 0)) {
    add('danger', 'Dividend saat financial pressure', 'Prioritaskan liquidity recovery sebelum cash distribution.', 20);
  }

  if (Number(d.equipment || 0) > 0 && Number(user.overdraft || 0) > 0) {
    add('warning', 'CAPEX saat overdraft aktif', 'Equipment investment dapat memperberat financing requirement.', 12);
  }

  if (spend > Number(user.cash || 0) + Math.max(Number(user.netProfit || 0), 0) + 900000) {
    add('warning', 'Cash commitment agresif', 'Total discretionary spend tinggi relatif terhadap current liquidity.', 10);
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    demandCoverage,
    plannedProduction,
    rmAfter,
    spend,
    checks
  };
}

export function roundDebrief(state) {
  const user = userCompany(state);
  const history = user.history || [];
  const current = history.at(-1);
  const previous = history.at(-2);
  if (!current || current.round === 0 || !previous) {
    return {
      headline: 'Belum ada round result untuk didebrief.',
      items: ['Submit Round 1 untuk mengaktifkan causal debrief dan next-action analysis.']
    };
  }

  const pctChange = (a, b) => b ? ((a - b) / Math.abs(b)) * 100 : 0;
  const items = [];
  const shareDelta = (current.marketShare - previous.marketShare) * 100;
  const salesDelta = pctChange(current.sales, previous.sales);
  const profitDelta = pctChange(current.netProfit, previous.netProfit);

  items.push(`Market share ${shareDelta >= 0 ? 'naik' : 'turun'} ${Math.abs(shareDelta).toFixed(2)} percentage point.`);
  items.push(`Sales ${salesDelta >= 0 ? 'naik' : 'turun'} ${Math.abs(salesDelta).toFixed(1)}% vs ronde sebelumnya.`);
  items.push(`Net profit berubah ${profitDelta >= 0 ? '+' : ''}${profitDelta.toFixed(1)}% vs ronde sebelumnya.`);

  if (current.potentialDemand > current.sales * 1.10) {
    items.push(`Unserved demand sekitar ${Math.round(current.potentialDemand - current.sales).toLocaleString('en-US')} unit; supply/capacity adalah bottleneck utama.`);
  }
  if (current.unitCost > current.price) {
    items.push(`Unit cost ${current.unitCost.toFixed(2)} masih di atas price ${current.price.toFixed(2)}; volume tanpa cost recovery dapat memperbesar loss.`);
  }
  if (current.overdraft > 0) {
    items.push(`Overdraft ${Math.round(current.overdraft).toLocaleString('en-US')} menambah financing pressure dan interest drag.`);
  }
  if (current.quality > previous.quality || current.image > previous.image) {
    items.push('Quality/image membaik; efek komersialnya perlu dibaca bersama price dan supply availability.');
  }

  let headline = 'Round relatif seimbang.';
  if (current.netProfit < 0 && current.potentialDemand > current.sales * 1.10) headline = 'Demand ada, tetapi economics dan supply belum menangkap peluang.';
  else if (current.netProfit < 0) headline = 'Prioritas berikutnya adalah margin dan liquidity recovery.';
  else if (current.marketShare > previous.marketShare && current.netProfit > previous.netProfit) headline = 'Growth dan profitability bergerak searah.';
  else if (current.marketShare > previous.marketShare && current.netProfit < previous.netProfit) headline = 'Share naik, tetapi kualitas growth perlu diperbaiki.';

  return { headline, items };
}

export function calibrationReport(state) {
  const user = userCompany(state);
  const r1 = (user.history || []).find(item => item.round === 1);
  if (!r1) return { available: false, comparable: false, score: null, rows: [] };

  const comparable = isReferenceDecision(r1.decision || {});
  const metrics = [
    ['Potential Demand','potentialDemand'],
    ['Sales','sales'],
    ['Market Share','marketShare'],
    ['Finished Goods','finishedGoods'],
    ['Next Capacity','capacity'],
    ['RM Inventory','rawMaterial'],
    ['Unit Cost','unitCost'],
    ['Revenue','revenue'],
    ['Net Earnings','netProfit'],
    ['Ending Cash','cash'],
    ['Overdraft','overdraft'],
    ['Equity','equity']
  ];

  const rows = metrics.map(([label,key]) => {
    const observed = Number(R1_CALIBRATION[key]);
    const simulated = Number(r1[key] || 0);
    const errorPct = observed === 0
      ? (simulated === 0 ? 0 : null)
      : Math.abs(simulated - observed) / Math.abs(observed) * 100;
    return { label, key, observed, simulated, errorPct };
  });

  const scored = rows.filter(row => row.errorPct !== null);
  const meanError = scored.length ? scored.reduce((s,row)=>s + Math.min(row.errorPct,100),0) / scored.length : 100;
  const score = comparable ? clamp(Math.round(100 - meanError), 0, 100) : null;

  return { available: true, comparable, score, rows };
}
