export const STORAGE_KEY = 'mbs_practice_v01';
export const CONFIG_KEY = 'mbs_supabase_config_v01';
export const ROLE_KEY = 'mbs_room_role_v01';

export const MAX_ROUNDS = 4;
export const BASE_MARKET_SIZE = 7_022_064;
export const MATERIAL_PER_UNIT = 1.43;
export const MATERIAL_PRICE = 1.15;
export const DISCOUNT_RATE = 0.08;

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
