import {
  BASELINE_MARKET_SHARE,
  BASELINE_SALES_PER_COMPANY,
  BOT_STRATEGIES,
  COMPETITION_FIELD_SIZE,
  DEFAULT_TIMER_SECONDS,
  LEGACY_STORAGE_KEYS,
  MAX_ROUNDS,
  ROUND1_REFERENCE,
  WORKBOOK_RESULT_ROUNDS,
  STORAGE_KEY,
  TARGET_CONVERSION_FACTOR
} from './config.js';
import { clamp, deepClone, rngFrom } from './utils.js';

export function snapshot(company, round, decision, economy, operational = {}) {
  return {
    round,
    decision: decision ? deepClone(decision) : deepClone(company.lastDecision),
    economy: deepClone(economy),
    event: deepClone(economy?.event || null),
    price: company.price,
    quality: company.quality,
    image: company.image,
    potentialDemand: company.potentialDemand,
    sales: company.sales,
    marketShare: company.marketShare,
    revenue: company.revenue,
    production: company.production,
    capacity: company.capacity,
    beginCapacity: operational.beginCapacity ?? company.capacity,
    maxProductionCapacity: operational.maxProductionCapacity ?? company.capacity * 1.5,
    rawMaterial: company.rawMaterial,
    beginRawMaterial: operational.beginRawMaterial ?? company.rawMaterial,
    procurementDelivered: operational.procurementDelivered ?? 0,
    finishedGoods: company.finishedGoods,
    conversionFactor: company.conversionFactor ?? TARGET_CONVERSION_FACTOR,
    nextConversionFactor: operational.nextConversionFactor ?? company.conversionFactor ?? TARGET_CONVERSION_FACTOR,
    unitCost: company.unitCost,
    netProfit: company.netProfit,
    cash: company.cash,
    overdraft: company.overdraft,
    equity: company.equity,
    currentRatio: company.currentRatio,
    roe: company.roe,
    profitMargin: company.profitMargin,
    npv: company.npv,
    balancedScore: company.balancedScore,
    financial: deepClone(company.financial || null)
  };
}

export function baselineUser(team = 'MARKOWITZ') {
  const company = {
    id: 'user',
    name: team.toUpperCase(),
    strategy: 'Human',
    isUser: true,
    price: 6.40,
    quality: 0.26,
    image: 0.60,
    potentialDemand: BASELINE_SALES_PER_COMPANY,
    sales: BASELINE_SALES_PER_COMPANY,
    marketShare: BASELINE_MARKET_SHARE,
    revenue: 2808826,
    production: 425641,
    capacity: 415000,
    rawMaterial: 1200000,
    finishedGoods: 51000,
    conversionFactor: TARGET_CONVERSION_FACTOR,
    unitCost: 5.42,
    netProfit: 306310,
    cash: 1648636,
    overdraft: 0,
    equity: 10710552,
    currentRatio: 2.15,
    roe: 0.0286,
    profitMargin: 0.1091,
    npv: 10710552,
    balancedScore: 72,
    financial: null,
    lastDecision: {
      price: 6.40,
      marketing: 150000,
      rd: 0,
      production: 425641,
      materialPurchase: 900000,
      equipment: 0,
      maintenance: 250000,
      dividend: 0
    },
    history: []
  };

  company.history.push(snapshot(company, 0, null, {
    priceIndex: 100,
    growth: 1,
    seasonal: 1,
    marketGrowth: 1,
    rawIndex: 1,
    event: null
  }, {
    beginCapacity: 415000,
    maxProductionCapacity: 622500,
    beginRawMaterial: 1200000,
    procurementDelivered: 0,
    nextConversionFactor: TARGET_CONVERSION_FACTOR
  }));

  return company;
}

function botBaseline(name, strategy, index) {
  const random = rngFrom(name + index);
  const company = baselineUser(name);
  company.id = `bot${index}`;
  company.strategy = strategy;
  company.isUser = false;
  company.price = 5.8 + random() * 1.5;
  company.quality = clamp(0.22 + random() * 0.22, 0.1, 0.9);
  company.image = clamp(0.42 + random() * 0.28, 0.1, 0.9);
  company.marketShare = BASELINE_MARKET_SHARE;
  company.potentialDemand = BASELINE_SALES_PER_COMPANY;
  company.sales = BASELINE_SALES_PER_COMPANY;
  company.revenue = company.sales * company.price;
  company.production = company.sales * (0.92 + random() * 0.16);
  company.capacity = 390000 + random() * 210000;
  company.rawMaterial = 900000 + random() * 900000;
  company.finishedGoods = 25000 + random() * 80000;
  company.conversionFactor = clamp(0.68 + random() * 0.04, 0.55, 0.75);
  company.unitCost = 4.9 + random() * 1.3;
  company.netProfit = (company.price - company.unitCost) * company.sales * 0.71;
  company.cash = 1400000 + random() * 1300000;
  company.equity = 9500000 + random() * 2600000;
  company.npv = company.equity;
  company.balancedScore = 58 + random() * 27;
  company.roe = company.netProfit / Math.max(company.equity, 1);
  company.profitMargin = company.netProfit / Math.max(company.revenue, 1);
  company.financial = null;
  company.history = [snapshot(company, 0, null, {
    priceIndex: 100,
    growth: 1,
    seasonal: 1,
    marketGrowth: 1,
    rawIndex: 1,
    event: null
  }, {
    beginCapacity: company.capacity,
    maxProductionCapacity: company.capacity * 1.5,
    beginRawMaterial: company.rawMaterial,
    procurementDelivered: 0,
    nextConversionFactor: company.conversionFactor
  })];
  return company;
}

function baselineField(team = 'MARKOWITZ') {
  return [
    baselineUser(team),
    ...BOT_STRATEGIES.slice(0, COMPETITION_FIELD_SIZE - 1).map((item, i) => botBaseline(item[0], item[1], i + 1))
  ];
}

export function makeInitialState(team = 'MARKOWITZ') {
  return {
    version: '1.4.6',
    baselineProfile: 'equal-share-16-r0-v13',
    logicCalibrationProfile: 'phase1-r1-v14',
    roomCode: '',
    roomKey: '',
    revision: 0,
    roomMembers: [],
    teamName: team.toUpperCase(),
    currentRound: 0,
    maxRounds: MAX_ROUNDS,
    mode: 'training',
    strategyGoal: 'balancedValue',
    optimizerRisk: 'balanced',
    workbookPlan: null,
    timerSeconds: DEFAULT_TIMER_SECONDS,
    timerRemaining: DEFAULT_TIMER_SECONDS,
    roundDeadlineAt: null,
    decisionLocked: false,
    lockReason: '',
    lastEvent: null,
    eventHistory: [],
    economy: null,
    surpriseMode: true,
    scenarioPreset: 'auto',
    sensitivity: { key: 'price', deltaPct: 10 },
    companies: baselineField(team),
    draft: deepClone(ROUND1_REFERENCE),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function migrateCompany(company) {
  company.conversionFactor = Number.isFinite(Number(company.conversionFactor))
    ? Number(company.conversionFactor)
    : TARGET_CONVERSION_FACTOR;

  if (Array.isArray(company.history)) {
    company.history = company.history.map(item => ({
      ...item,
      beginCapacity: Number.isFinite(Number(item.beginCapacity)) ? Number(item.beginCapacity) : Number(item.capacity || company.capacity),
      maxProductionCapacity: Number.isFinite(Number(item.maxProductionCapacity)) ? Number(item.maxProductionCapacity) : Number(item.capacity || company.capacity) * 1.5,
      beginRawMaterial: Number.isFinite(Number(item.beginRawMaterial)) ? Number(item.beginRawMaterial) : Number(item.rawMaterial || company.rawMaterial),
      procurementDelivered: Number.isFinite(Number(item.procurementDelivered)) ? Number(item.procurementDelivered) : Number(item.decision?.materialPurchase || 0),
      conversionFactor: Number.isFinite(Number(item.conversionFactor)) ? Number(item.conversionFactor) : company.conversionFactor,
      nextConversionFactor: Number.isFinite(Number(item.nextConversionFactor)) ? Number(item.nextConversionFactor) : company.conversionFactor
    }));
  }
  return company;
}

export function migrateState(input) {
  if (!input || !Array.isArray(input.companies)) return makeInitialState();
  const state = deepClone(input);
  state.version = '1.4.6';
  state.mode = ['training', 'competition', 'sandbox', 'workbook'].includes(state.mode) ? state.mode : 'training';
  state.timerSeconds = Number(state.timerSeconds) > 0 ? Number(state.timerSeconds) : DEFAULT_TIMER_SECONDS;
  state.timerRemaining = Number.isFinite(Number(state.timerRemaining)) ? Number(state.timerRemaining) : state.timerSeconds;
  state.roundDeadlineAt = state.roundDeadlineAt || null;
  state.decisionLocked = Boolean(state.decisionLocked);
  state.lockReason = state.lockReason || '';
  state.eventHistory = Array.isArray(state.eventHistory) ? state.eventHistory : [];
  if (state.lastEvent && state.eventHistory.length === 0 && state.currentRound > 0) {
    state.eventHistory.push({ round: state.currentRound, ...state.lastEvent });
  }
  state.scenarioPreset = state.scenarioPreset || 'auto';
  state.sensitivity = state.sensitivity || { key: 'price', deltaPct: 10 };
  state.maxRounds = state.mode === 'workbook' ? WORKBOOK_RESULT_ROUNDS : (state.maxRounds || MAX_ROUNDS);
  state.strategyGoal = state.strategyGoal || 'balancedValue';
  state.optimizerRisk = ['conservative','balanced','aggressive'].includes(state.optimizerRisk) ? state.optimizerRisk : 'balanced';
  state.workbookPlan = state.workbookPlan || null;
  state.revision = Number.isFinite(Number(state.revision)) ? Number(state.revision) : 0;
  state.roomMembers = Array.isArray(state.roomMembers) ? state.roomMembers : [];
  state.companies = state.companies.map(migrateCompany);

  if (!state.logicCalibrationProfile) {
    state.logicCalibrationProfile = state.currentRound === 0
      ? 'phase1-r1-v14'
      : 'legacy-active-pre-v14';
  }

  const hasV13Baseline = state.baselineProfile === 'equal-share-16-r0-v13'
    && state.companies.length === COMPETITION_FIELD_SIZE;

  if (state.currentRound === 0 && !hasV13Baseline) {
    state.companies = baselineField(state.teamName || 'MARKOWITZ');
    state.baselineProfile = 'equal-share-16-r0-v13';
  } else if (!hasV13Baseline) {
    state.baselineProfile = 'legacy-active-run-pre-v13';
  }

  return state;
}

export function loadState() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return migrateState(JSON.parse(current));
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const raw = localStorage.getItem(legacyKey);
      if (raw) {
        const migrated = migrateState(JSON.parse(raw));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch (error) {
    console.warn('Could not load local state:', error);
  }
  return makeInitialState();
}

export function saveLocal(state, { touch = true } = {}) {
  if (touch) state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function userCompany(state) {
  return state.companies.find(company => company.isUser);
}
