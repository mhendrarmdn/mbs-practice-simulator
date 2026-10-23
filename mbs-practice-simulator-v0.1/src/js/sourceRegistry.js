export const EVIDENCE_LEVELS = {
  confirmed: { label: 'Confirmed', tone: 'confirmed', description: 'Directly stated in supplied official materials or observed in captured official output.' },
  derived: { label: 'Derived', tone: 'derived', description: 'Reconciled from official statements or deterministic accounting relationships, but not published as a TopBoss formula.' },
  calibrated: { label: 'Calibrated', tone: 'calibrated', description: 'Estimated from official prediction-versus-actual observations and expected to improve as rounds accumulate.' },
  assumption: { label: 'Assumption', tone: 'assumption', description: 'Transparent practice-only modeling choice used for scenario exploration.' },
  unknown: { label: 'Unknown', tone: 'unknown', description: 'Proprietary or unpublished mechanic. Never present as exact.' }
};

export const OFFICIAL_RULES = [
  { id:'decision-set', title:'Eight management decisions', status:'confirmed', detail:'Price, production volume, raw-material procurement, marketing, improvement R&D, maintenance, equipment investment, and dividend.', source:'Student Workbook pp. 3, 9, 13, 16' },
  { id:'procurement-lag', title:'Procurement arrives next round', status:'confirmed', detail:'Raw materials procured this round become available at the end of the round / beginning of the next round.', source:'Student Workbook p. 15' },
  { id:'production-buffer', title:'Production must manage finished-goods buffer', status:'confirmed', detail:'Over-production creates finished-goods inventory; under-production can create lost sales. Production planning references next-round capacity.', source:'Student Workbook pp. 17–18' },
  { id:'marketing-rd', title:'Marketing and R&D work together', status:'confirmed', detail:'Marketing supports visibility/value perception while R&D supports product quality. Neither alone guarantees potential demand.', source:'Student Workbook pp. 10–12' },
  { id:'capacity-aging', title:'Capacity ages 2.5% per round', status:'confirmed', detail:'Production capacity deteriorates with aging at 2.5% round after round.', source:'Student Workbook p. 20' },
  { id:'overtime-cap', title:'Overtime is capped at 50%', status:'confirmed', detail:'Overtime production can extend capacity by up to 50% of normal capacity.', source:'Student Workbook pp. 13, 20' },
  { id:'equipment-cost', title:'Capacity expansion costs $20 per unit', status:'confirmed', detail:'The workbook states $20 investment for one additional product unit of capacity.', source:'Student Workbook p. 20' },
  { id:'conversion-target', title:'Conversion factor target around 0.7', status:'confirmed', detail:'Maintenance is used to slow efficiency deterioration; the workbook describes ~0.7 as the target/optimal conversion factor.', source:'Student Workbook pp. 20–22' },
  { id:'maintenance-equipment-lag', title:'Maintenance/equipment affect next round', status:'confirmed', detail:'The impact of maintenance and equipment investment made this round materializes in the next round.', source:'Student Workbook p. 20' },
  { id:'dividend-npv', title:'Dividend contributes to valuation but reduces liquidity', status:'confirmed', detail:'Dividend payout adds to the company NPV calculus while reducing liquidity available for growth.', source:'Student Workbook p. 24' },
  { id:'competition-goal', title:'Competition targets highest NPV after four rounds', status:'confirmed', detail:'The 2026 competition booklet states the main goal is highest NPV at the end of four game rounds and asks teams to track NPV and balanced scorecard.', source:'Competition Booklet p. 5' },
  { id:'prelim-format', title:'Preliminary uses four rounds', status:'confirmed', detail:'Preliminary performance over four rounds determines advancement; top two NPV teams in each group advance.', source:'Competition Booklet p. 7' },
  { id:'final-format', title:'Final has four fixed rounds + up to two surprise rounds', status:'confirmed', detail:'The final round format may extend beyond the four fixed rounds with up to two surprise rounds.', source:'Competition Booklet p. 8' }
];

export const MODEL_BOUNDARIES = [
  { title:'Exact demand elasticity / price-response curve', status:'unknown', action:'Calibrate from official decision-versus-result pairs.' },
  { title:'Exact marketing-to-image response curve and ceiling', status:'unknown', action:'Use observed Product Image Index changes; keep practice curve labeled calibrated.' },
  { title:'Exact R&D-to-quality response curve and ceiling', status:'unknown', action:'Use observed Product Quality Index changes; do not hard-code as official.' },
  { title:'Market-share transfer between competitors', status:'unknown', action:'Estimate only after observing competitor/result panels across rounds.' },
  { title:'Raw-material market price response to aggregate procurement', status:'unknown', action:'Treat practice pricing as scenario assumption until official pairs exist.' },
  { title:'Exact overtime, warehouse, purchasing, depreciation, interest, and tax functions', status:'unknown', action:'Reconcile from official financial statements before promoting any rule.' },
  { title:'Official NPV equation / discounting', status:'unknown', action:'Practice NPV must stay explicitly labeled as estimate.' },
  { title:'Official balanced-scorecard equation', status:'unknown', action:'Track published components, but do not claim the simulator score is official.' }
];

export function evidenceSummary(){
  const summary={confirmed:0,derived:0,calibrated:0,assumption:0,unknown:0};
  for (const row of OFFICIAL_RULES) summary[row.status]=(summary[row.status]||0)+1;
  for (const row of MODEL_BOUNDARIES) summary[row.status]=(summary[row.status]||0)+1;
  return summary;
}
