export const STORAGE_KEY = 'mbs_practice_v10';
export const LEGACY_STORAGE_KEYS = ['mbs_practice_v09', 'mbs_practice_v08', 'mbs_practice_v07', 'mbs_practice_v06', 'mbs_practice_v05', 'mbs_practice_v04', 'mbs_practice_v03', 'mbs_practice_v02', 'mbs_practice_v01'];
export const CONFIG_KEY = 'mbs_supabase_config_v01';
export const ROLE_KEY = 'mbs_room_role_v01';
export const ROOM_SESSION_KEY = 'mbs_room_session_v03';
export const THEME_KEY = 'mbs_theme_v02';

// Public deployment defaults. Vite replaces these at build time when configured in Vercel.
// The Supabase anon/publishable key is intentionally public; never put a service-role key here.
export const DEPLOY_SUPABASE_URL = String(import.meta.env?.VITE_SUPABASE_URL || '').replace(/\/$/, '');
export const DEPLOY_SUPABASE_ANON_KEY = String(
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
);

export const MAX_ROUNDS = 4;
export const WORKBOOK_RESULT_ROUNDS = 5;
export const WORKBOOK_PLAN_ROUND = 6;
export const DEFAULT_TIMER_SECONDS = 15 * 60;
export const BASE_MARKET_SIZE = 7_022_064;
export const COMPETITION_FIELD_SIZE = 16;
export const BASELINE_MARKET_SHARE = 1 / COMPETITION_FIELD_SIZE;
export const BASELINE_SALES_PER_COMPANY = BASE_MARKET_SIZE / COMPETITION_FIELD_SIZE;
export const MATERIAL_PER_UNIT = 1.43;
export const MATERIAL_PRICE = 1.15;
export const DISCOUNT_RATE = 0.08;

// Explicit workbook mechanics used by the v0.5 operations-fidelity layer.
export const OVERTIME_LIMIT = 0.50;
export const CAPACITY_AGING_RATE = 0.025;
export const CAPACITY_COST_PER_UNIT = 20;
export const TARGET_CONVERSION_FACTOR = 0.70;
export const MAINTENANCE_REFERENCE = 280000;

// v1.4.x transparent Phase-1 calibration coefficients.
// These are practice-model fit parameters, not proprietary TopBoss formulas.
export const QUALITY_RD_RESPONSE = 0.093;
export const IMAGE_MARKETING_RESPONSE = 0.043;
export const ATTRACTIVENESS_QUALITY_WEIGHT = 2.20;
export const ATTRACTIVENESS_IMAGE_WEIGHT = 1.55;
export const ATTRACTIVENESS_PRICE_WEIGHT = 2.30;
export const ATTRACTIVENESS_MARKETING_WEIGHT = 0.25;
export const ATTRACTIVENESS_RD_WEIGHT = 0.50;
export const DIRECT_UNIT_COST_BASE = 3.325792;
export const WORKBOOK_R1_DEMAND_FACTOR = 1.13528475;

export const BOT_STRATEGIES = [
  ['PREMIUM', 'Premium'],
  ['LEAN COST', 'Low Cost'],
  ['GROWTH LAB', 'Aggressive Growth'],
  ['QUALITY FIRST', 'R&D Heavy'],
  ['VOLUME MAX', 'Volume Leader'],
  ['FORTRESS', 'Conservative'],
  ['CAPEX PRO', 'Capacity Expansion'],
  ['CASH KING', 'Cash Maximizer'],
  ['BALANCED AI', 'Balanced'],
  ['PRICE EDGE', 'Value Pricing'],
  ['BRAND BUILDER', 'Brand Builder'],
  ['SUPPLY CORE', 'Supply Resilience'],
  ['OPS MASTER', 'Operations Efficiency'],
  ['MARKET HUNTER', 'Market Capture'],
  ['VALUE MIX', 'Balanced Value']
];

export const ROUND1_REFERENCE = {
  price: 6.40,
  marketing: 190000,
  rd: 300000,
  production: 240968,
  materialPurchase: 1550000,
  equipment: 300000,
  maintenance: 280000,
  dividend: 0
};

export const OBSERVED_ANCHORS = [
  ['Round 0 Revenue', '$2,808,826'],
  ['Round 0 Sales', '438,879'],
  ['Round 0 Price', '$6.40'],
  ['Round 0 Market Share', '6.25%'],
  ['Round 0 Net Profit', '$306,310'],
  ['Round 0 Unit Cost', '$5.42'],
  ['Round 1 Potential Demand', '552,620'],
  ['Round 1 Sales', '291,968'],
  ['Round 1 Finished Goods', '0'],
  ['Round 1 Production', '240,968'],
  ['Round 1 Quality', '0.34'],
  ['Round 1 Image', '0.62'],
  ['Round 1 Next Capacity', '418,924'],
  ['Round 1 RM Inventory', '2,405,416'],
  ['Round 1 Unit Cost', '$7.96'],
  ['Round 1 Revenue', '$1,868,595'],
  ['Round 1 Net Earnings', '-$456,502'],
  ['Round 1 Ending Cash', '$0'],
  ['Round 1 Overdraft', '$776,366'],
  ['Round 1 Equity', '$10,254,050']
];

export const TRAINING_PROXY_NOTES = [
  'Demand response and competitive attractiveness are independent training approximations.',
  'Practice NPV is a transparent proxy, not the proprietary TopBoss NPV equation.',
  'Balanced Score is a practice proxy built from profit, liquidity, market share, and returns.',
  'v1.4 Phase 1 fits transparent practice coefficients to the observed R0 → R1 reference pair; R2–R5 observations are still needed for out-of-sample validation.',
  'v1.8 adaptive calibration learns bounded, shrinkage-weighted corrections from official prediction-vs-actual pairs. It improves the practice model but does not reveal or replicate proprietary TopBoss formulas.',
  'AI competitors are strategy archetypes that adapt to prior-round performance; they are not replicas of actual teams.',
  'v1.3 uses a 16-company Round 0 equal-share baseline (6.25% each). This is a parity assumption inferred from the observed 6.25% Round 0 share and the 7,022,064 base market size; competitor names and strategies remain synthetic.'
];


export const R1_CALIBRATION = {
  potentialDemand: 552620,
  sales: 291968,
  marketShare: 0.0693,
  finishedGoods: 0,
  production: 240968,
  capacity: 418924,
  rawMaterial: 2405416,
  quality: 0.34,
  image: 0.62,
  unitCost: 7.96,
  revenue: 1868595,
  netProfit: -456502,
  cash: 0,
  overdraft: 776366,
  equity: 10254050
};

export const CALIBRATION_PHASE1 = {
  id: 'r0-r1-reference-v14',
  label: 'Logic Calibration Phase 1',
  scope: 'Observed R0 baseline + one observed R1 decision/result pair',
  comparableMode: 'workbook',
  observedRound: 1,
  coefficients: [
    ['Quality R&D response', QUALITY_RD_RESPONSE],
    ['Image marketing response', IMAGE_MARKETING_RESPONSE],
    ['Attractiveness: quality', ATTRACTIVENESS_QUALITY_WEIGHT],
    ['Attractiveness: image', ATTRACTIVENESS_IMAGE_WEIGHT],
    ['Attractiveness: price', ATTRACTIVENESS_PRICE_WEIGHT],
    ['Attractiveness: marketing', ATTRACTIVENESS_MARKETING_WEIGHT],
    ['Attractiveness: R&D', ATTRACTIVENESS_RD_WEIGHT],
    ['Direct unit-cost base', DIRECT_UNIT_COST_BASE],
    ['Workbook R1 demand factor', WORKBOOK_R1_DEMAND_FACTOR]
  ]
};

export const SCENARIO_PRESETS = {
  auto: {
    label: 'Auto / Competition-like',
    description: 'Macro bergerak secara seeded dan surprise event dapat muncul sesuai rules.'
  },
  baseline: {
    label: 'Controlled Baseline',
    description: 'Growth, seasonal, raw material, dan capacity dibuat netral untuk eksperimen.',
    growth: 1,
    seasonal: 1,
    raw: 1,
    capacity: 1,
    event: null
  },
  demandBoom: {
    label: 'Demand Boom',
    description: 'Permintaan pasar didorong +15% untuk stress-test supply dan capacity.',
    demand: 1.15,
    raw: 1,
    capacity: 1,
    event: { title: 'Demand Boom', text: 'Preset: permintaan pasar naik 15%.', raw: 1, demand: 1.15, capacity: 1 }
  },
  slowdown: {
    label: 'Economic Slowdown',
    description: 'Permintaan turun 12% untuk menguji inventory dan margin discipline.',
    demand: 0.88,
    raw: 1,
    capacity: 1,
    event: { title: 'Economic Slowdown', text: 'Preset: permintaan pasar turun 12%.', raw: 1, demand: 0.88, capacity: 1 }
  },
  rawShock: {
    label: 'Raw Material Shock',
    description: 'Raw material index naik 18% untuk menguji pricing dan working capital.',
    demand: 1,
    raw: 1.18,
    capacity: 1,
    event: { title: 'Raw Material Shock', text: 'Preset: harga input naik 18%.', raw: 1.18, demand: 1, capacity: 1 }
  },
  equipmentDisruption: {
    label: 'Equipment Disruption',
    description: 'Capacity efektif turun 10% untuk menguji resilience operasi.',
    demand: 1,
    raw: 1,
    capacity: 0.90,
    event: { title: 'Equipment Disruption', text: 'Preset: capacity efektif turun 10%.', raw: 1, demand: 1, capacity: 0.90 }
  }
};


export const STRATEGY_GOALS = {
  balancedValue: {
    label: 'Balanced Value',
    short: 'Balance NPV, profit, liquidity, and market position.',
    description: 'Prioritaskan value creation yang seimbang: profit, cash resilience, market share, dan kemampuan operasi harus bergerak tanpa satu KPI mengorbankan yang lain.'
  },
  profitability: {
    label: 'Profitability First',
    short: 'Protect margin, ROE, and unit economics.',
    description: 'Fokus pada spread price–unit cost, profit margin, ROE, dan disiplin discretionary spending.'
  },
  marketLeadership: {
    label: 'Market Leadership',
    short: 'Grow share with sufficient supply and brand support.',
    description: 'Fokus pada market share, demand capture, marketing/R&D support, dan supply readiness tanpa mengabaikan economics.'
  },
  liquidityDefense: {
    label: 'Liquidity Defense',
    short: 'Protect cash, current ratio, and avoid overdraft.',
    description: 'Fokus pada cash preservation, current ratio, pengurangan overdraft, serta pengendalian CAPEX/dividend/spending.'
  },
  capacityGrowth: {
    label: 'Capacity Growth',
    short: 'Prepare operations for demand and future scale.',
    description: 'Fokus pada capacity, production coverage, raw-material readiness, dan equipment investment yang punya horizon payoff jelas.'
  },
  premiumBrand: {
    label: 'Premium Brand',
    short: 'Build quality, image, and pricing power.',
    description: 'Fokus pada quality, image, R&D, marketing, dan pricing power sambil menjaga demand serta margin.'
  }
};


export const OPTIMIZER_RISK_PROFILES = {
  conservative: {
    label: 'Conservative',
    description: 'Lebih berat ke worst-case, liquidity, dan downside protection.'
  },
  balanced: {
    label: 'Balanced',
    description: 'Menyeimbangkan strategy alignment, average Practice NPV, dan downside resilience.'
  },
  aggressive: {
    label: 'Aggressive',
    description: 'Lebih berat ke upside Practice NPV dan market capture, dengan downside tolerance lebih tinggi.'
  }
};
