export const STORAGE_KEY = 'mbs_practice_v07';
export const LEGACY_STORAGE_KEYS = ['mbs_practice_v06', 'mbs_practice_v05', 'mbs_practice_v04', 'mbs_practice_v03', 'mbs_practice_v02', 'mbs_practice_v01'];
export const CONFIG_KEY = 'mbs_supabase_config_v01';
export const ROLE_KEY = 'mbs_room_role_v01';
export const ROOM_SESSION_KEY = 'mbs_room_session_v03';
export const THEME_KEY = 'mbs_theme_v02';

export const MAX_ROUNDS = 4;
export const WORKBOOK_RESULT_ROUNDS = 5;
export const WORKBOOK_PLAN_ROUND = 6;
export const DEFAULT_TIMER_SECONDS = 15 * 60;
export const BASE_MARKET_SIZE = 7_022_064;
export const MATERIAL_PER_UNIT = 1.43;
export const MATERIAL_PRICE = 1.15;
export const DISCOUNT_RATE = 0.08;

// Explicit workbook mechanics used by the v0.5 operations-fidelity layer.
export const OVERTIME_LIMIT = 0.50;
export const CAPACITY_AGING_RATE = 0.025;
export const CAPACITY_COST_PER_UNIT = 20;
export const TARGET_CONVERSION_FACTOR = 0.70;
export const MAINTENANCE_REFERENCE = 280000;

export const BOT_STRATEGIES = [
  ['PREMIUM', 'Premium'],
  ['LEAN COST', 'Low Cost'],
  ['GROWTH LAB', 'Aggressive Growth'],
  ['QUALITY FIRST', 'R&D Heavy'],
  ['VOLUME MAX', 'Volume Leader'],
  ['FORTRESS', 'Conservative'],
  ['CAPEX PRO', 'Capacity Expansion'],
  ['CASH KING', 'Cash Maximizer'],
  ['BALANCED AI', 'Balanced']
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
  'Cost and finance relationships are calibrated heuristics and should be refined as more real decision → result pairs become available.',
  'AI competitors are strategy archetypes that adapt to prior-round performance; they are not replicas of actual teams.'
];


export const R1_CALIBRATION = {
  potentialDemand: 552620,
  sales: 291968,
  marketShare: 0.0693,
  finishedGoods: 0,
  capacity: 418924,
  rawMaterial: 2405416,
  unitCost: 7.96,
  revenue: 1868595,
  netProfit: -456502,
  cash: 0,
  overdraft: 776366,
  equity: 10254050
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
