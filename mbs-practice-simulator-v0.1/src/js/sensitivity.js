import { userCompany } from './state.js';

export function previewSensitivity(state, key, deltaPct) {
  const user = userCompany(state);
  const pct = Number(deltaPct) || 0;
  const priceEffect = key === 'price' ? -pct * 0.85 : 0;
  const demandEffect =
    (key === 'marketing' ? pct * 0.16 : 0) +
    (key === 'rd' ? pct * 0.12 : 0) +
    priceEffect;

  const capacityHeadroom = Math.max(
    0,
    ((user.capacity - user.production) / Math.max(user.production, 1)) * 100
  );
  const capacityEffect = key === 'production'
    ? Math.min(pct, capacityHeadroom)
    : 0;

  const revenueEffect =
    demandEffect +
    (key === 'price' ? pct : 0) +
    capacityEffect * 0.25;

  const spendDrag =
    (key === 'marketing' || key === 'rd')
      ? Math.max(0, pct) * 0.08
      : 0;

  return {
    demandEffect,
    revenueEffect,
    profitEffect: revenueEffect - spendDrag
  };
}
