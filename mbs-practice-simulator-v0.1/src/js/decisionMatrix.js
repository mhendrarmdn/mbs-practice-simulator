import { WORKBOOK_PLAN_ROUND } from './config.js';
import { userCompany } from './state.js';

export function decisionMatrices(state) {
  const user = userCompany(state);
  const history = user.history || [];

  const row = item => ({
    round: item.round,
    label: `R${item.round}`,
    isPlan: false,
    decision: item.decision || {},
    revenue: item.revenue,
    netProfit: item.netProfit,
    cashExpenditure:
      Number(item.decision?.marketing || 0) +
      Number(item.decision?.rd || 0) +
      Number(item.decision?.maintenance || 0) +
      Number(item.decision?.equipment || 0) +
      Number(item.decision?.dividend || 0) +
      Number(item.decision?.materialPurchase || 0),
    cash: item.cash,
    equity: item.equity,
    sales: item.sales,
    share: item.marketShare,
    unitCost: item.unitCost,
    image: item.image,
    quality: item.quality,
    capacity: item.capacity,
    beginCapacity: item.beginCapacity,
    maxProductionCapacity: item.maxProductionCapacity,
    beginRawMaterial: item.beginRawMaterial,
    rawMaterial: item.rawMaterial,
    procurementDelivered: item.procurementDelivered,
    production: item.production,
    finishedGoods: item.finishedGoods,
    conversionFactor: item.conversionFactor,
    nextConversionFactor: item.nextConversionFactor
  });

  const rows = history.map(row);
  const planDecision = state.workbookPlan?.decision || (state.mode === 'workbook' && state.currentRound >= 5 ? state.draft : null);
  const planRow = planDecision ? {
    round: WORKBOOK_PLAN_ROUND,
    label: 'R6 PLAN',
    isPlan: true,
    decision: planDecision,
    revenue: null,
    netProfit: null,
    cashExpenditure:
      Number(planDecision.marketing || 0) +
      Number(planDecision.rd || 0) +
      Number(planDecision.maintenance || 0) +
      Number(planDecision.equipment || 0) +
      Number(planDecision.dividend || 0) +
      Number(planDecision.materialPurchase || 0),
    cash: null,
    equity: null,
    sales: null,
    share: null,
    unitCost: null,
    image: null,
    quality: null,
    capacity: null,
    beginCapacity: user.capacity,
    maxProductionCapacity: user.capacity * 1.5,
    beginRawMaterial: user.rawMaterial,
    rawMaterial: null,
    procurementDelivered: null,
    production: null,
    finishedGoods: null,
    conversionFactor: user.conversionFactor,
    nextConversionFactor: null
  } : null;

  const withPlan = source => planRow ? [...source, planRow] : source;

  return [
    {
      id: 'overall',
      title: 'Overall Business Matrix',
      subtitle: 'Eight decisions → revenue, earnings, cash expenditure, cash balance, owners’ equity. R6 is plan-only.',
      columns: [
        ['label','Round'],['revenue','Revenue'],['netProfit','Earnings'],
        ['cashExpenditure','Cash Expenditure'],['cash','Cash Balance'],['equity','Owners’ Equity']
      ],
      rows: withPlan(rows)
    },
    {
      id: 'price',
      title: 'Price Matrix',
      subtitle: 'Price → revenue, sales volume, market share, earnings; unit cost as reference. R6 outcomes intentionally blank.',
      columns: [
        ['label','Round'],['price','Price'],['revenue','Revenue'],['sales','Sales'],
        ['share','Market Share'],['netProfit','Earnings'],['unitCost','Unit Cost']
      ],
      rows: withPlan(rows.map(r=>({...r,price:r.decision.price}))).map(r=>({...r,price:r.decision?.price}))
    },
    {
      id: 'marketing-rd',
      title: 'Marketing & R&D Matrix',
      subtitle: 'Marketing → image; R&D → quality; sales volume is the KPI with next production capacity as reference.',
      columns: [
        ['label','Round'],['marketing','Marketing'],['image','Image'],['rd','R&D'],
        ['quality','Quality'],['sales','Sales'],['capacity','Next Capacity']
      ],
      rows: withPlan(rows.map(r=>({...r,marketing:r.decision.marketing,rd:r.decision.rd}))).map(r=>({...r,marketing:r.decision?.marketing,rd:r.decision?.rd}))
    },
    {
      id: 'procurement',
      title: 'Procurement Matrix',
      subtitle: 'Procurement arrives at end-of-round / beginning of next round. R6 records the decision only.',
      columns: [
        ['label','Round'],['materialPurchase','Procurement'],['beginRawMaterial','Beginning RM'],
        ['rawMaterial','Ending RM / Next Beginning'],['capacity','Next Capacity']
      ],
      rows: withPlan(rows.map(r=>({...r,materialPurchase:r.decision.materialPurchase}))).map(r=>({...r,materialPurchase:r.decision?.materialPurchase}))
    },
    {
      id: 'production',
      title: 'Production Matrix',
      subtitle: 'Production request → actual production; finished goods inventory is the KPI, with next capacity as reference.',
      columns: [
        ['label','Round'],['productionRequest','Production Request'],['production','Actual Production'],
        ['finishedGoods','FG Inventory'],['capacity','Next Capacity']
      ],
      rows: withPlan(rows.map(r=>({...r,productionRequest:r.decision.production}))).map(r=>({...r,productionRequest:r.decision?.production}))
    },
    {
      id: 'maintenance-equipment',
      title: 'Maintenance & Equipment Matrix',
      subtitle: 'Maintenance → conversion factor; equipment → next production capacity. R6 is planning-only.',
      columns: [
        ['label','Round'],['maintenance','Maintenance'],['nextConversionFactor','Conversion Factor'],
        ['equipment','Equipment'],['capacity','Next Capacity']
      ],
      rows: withPlan(rows.map(r=>({...r,maintenance:r.decision.maintenance,equipment:r.decision.equipment}))).map(r=>({...r,maintenance:r.decision?.maintenance,equipment:r.decision?.equipment}))
    },
    {
      id: 'dividend',
      title: 'Dividend Matrix',
      subtitle: 'Dividend → end-period cash balance; owners’ equity is a reference. R6 outcomes remain blank.',
      columns: [
        ['label','Round'],['dividend','Dividend'],['cash','End Cash Balance'],['equity','Owners’ Equity']
      ],
      rows: withPlan(rows.map(r=>({...r,dividend:r.decision.dividend}))).map(r=>({...r,dividend:r.decision?.dividend}))
    }
  ];
}
