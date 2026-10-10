import { userCompany } from './state.js';

export function decisionMatrices(state) {
  const user = userCompany(state);
  const history = user.history || [];

  const row = item => ({
    round: item.round,
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

  return [
    {
      id: 'overall',
      title: 'Overall Business Matrix',
      subtitle: 'Eight decisions → revenue, earnings, cash expenditure, cash balance, owners’ equity.',
      columns: [
        ['round','Round'],['revenue','Revenue'],['netProfit','Earnings'],
        ['cashExpenditure','Cash Expenditure'],['cash','Cash Balance'],['equity','Owners’ Equity']
      ],
      rows
    },
    {
      id: 'price',
      title: 'Price Matrix',
      subtitle: 'Price → revenue, sales volume, market share, earnings; unit cost as reference.',
      columns: [
        ['round','Round'],['price','Price'],['revenue','Revenue'],['sales','Sales'],
        ['share','Market Share'],['netProfit','Earnings'],['unitCost','Unit Cost']
      ],
      rows: rows.map(r=>({...r,price:r.decision.price}))
    },
    {
      id: 'marketing-rd',
      title: 'Marketing & R&D Matrix',
      subtitle: 'Marketing → image; R&D → quality; sales volume is the KPI with next production capacity as reference.',
      columns: [
        ['round','Round'],['marketing','Marketing'],['image','Image'],['rd','R&D'],
        ['quality','Quality'],['sales','Sales'],['capacity','Next Capacity']
      ],
      rows: rows.map(r=>({...r,marketing:r.decision.marketing,rd:r.decision.rd}))
    },
    {
      id: 'procurement',
      title: 'Procurement Matrix',
      subtitle: 'Procurement arrives at end-of-round / beginning of next round. Ending RM inventory is the key outcome/KPI.',
      columns: [
        ['round','Round'],['materialPurchase','Procurement'],['beginRawMaterial','Beginning RM'],
        ['rawMaterial','Ending RM / Next Beginning'],['capacity','Next Capacity']
      ],
      rows: rows.map(r=>({...r,materialPurchase:r.decision.materialPurchase}))
    },
    {
      id: 'production',
      title: 'Production Matrix',
      subtitle: 'Production request → actual production; finished goods inventory is the KPI, with next capacity as reference.',
      columns: [
        ['round','Round'],['productionRequest','Production Request'],['production','Actual Production'],
        ['finishedGoods','FG Inventory'],['capacity','Next Capacity']
      ],
      rows: rows.map(r=>({...r,productionRequest:r.decision.production}))
    },
    {
      id: 'maintenance-equipment',
      title: 'Maintenance & Equipment Matrix',
      subtitle: 'Maintenance → conversion factor; equipment → next production capacity.',
      columns: [
        ['round','Round'],['maintenance','Maintenance'],['nextConversionFactor','Conversion Factor'],
        ['equipment','Equipment'],['capacity','Next Capacity']
      ],
      rows: rows.map(r=>({...r,maintenance:r.decision.maintenance,equipment:r.decision.equipment}))
    },
    {
      id: 'dividend',
      title: 'Dividend Matrix',
      subtitle: 'Dividend → end-period cash balance; owners’ equity is a reference for liquidity/value trade-off.',
      columns: [
        ['round','Round'],['dividend','Dividend'],['cash','End Cash Balance'],['equity','Owners’ Equity']
      ],
      rows: rows.map(r=>({...r,dividend:r.decision.dividend}))
    }
  ];
}
