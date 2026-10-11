import { countFinancialFields, FINANCIAL_FIELDS, reconciliationForRound } from './officialSync.js';
import { esc, fixed, money, num, pct } from './utils.js';

function numberInput(label,id,value='',opts={}) {
  const step=opts.step || 'any';
  const suffix=opts.suffix ? `<span class="official-suffix">${esc(opts.suffix)}</span>` : '';
  return `<label class="official-field"><span>${esc(label)}</span><div><input id="${id}" type="number" step="${step}" value="${value ?? ''}" placeholder="${esc(opts.placeholder||'')}">${suffix}</div></label>`;
}
function textInput(label,id,value='',opts={}) {
  return `<label class="official-field ${opts.wide?'official-wide':''}"><span>${esc(label)}</span><div><input id="${id}" type="text" value="${esc(value||'')}" placeholder="${esc(opts.placeholder||'')}"></div></label>`;
}
function val(value,digits=3) { return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : ''; }
function whole(value) { return Number.isFinite(Number(value)) ? Math.round(Number(value)) : ''; }
function format(key,value) {
  if (key==='marketShare') return pct(value);
  if (['revenue','netProfit','cash','overdraft','equity','price','unitCost'].includes(key)) return money(value);
  if (['quality','image'].includes(key)) return fixed(value,3);
  return num(value);
}
function label(key) {
  const map={revenue:'Revenue',netProfit:'Net Profit',sales:'Sales',marketShare:'Market Share',price:'Selling Price',unitCost:'Unit Cost',cash:'Cash',overdraft:'Overdraft',equity:'Equity',quality:'Quality',image:'Image',potentialDemand:'Potential Demand',production:'Production',capacity:'Capacity',rawMaterial:'Raw Material',finishedGoods:'Finished Goods'};
  return map[key]||key;
}
function table(headers,rows) {
  return `<div class="tb-table-wrap"><table class="tb-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

const FINANCIAL_LABELS={
  balanceSheet:{cash:'Cash',rawMaterialInventory:'Raw Material Inventory',finishedGoodsInventory:'Finished Goods Inventory',currentAssets:'Current Assets',fixedAndOtherAssets:'Fixed & Other Assets',totalAssets:'Total Assets',operatingLiabilities:'Operating Liabilities',overdraft:'Overdraft',totalLiabilities:'Total Liabilities',ownersEquity:"Owners' Equity",totalLiabilitiesAndEquity:'Liabilities + Equity'},
  cashFlow:{beginningCash:'Beginning Cash',revenue:'Revenue / Receipts',cashExpenditure:'Cash Expenditure',operatingCashFlow:'Operating Cash Flow',rawMaterialPurchase:'Raw Material Purchase',equipmentInvestment:'Equipment Investment',dividend:'Dividend',cashBeforeFinancing:'Cash Before Financing',overdraft:'Overdraft Financing',endingCash:'Ending Cash'},
  incomeStatement:{revenue:'Revenue',costOfGoodsSold:'Cost of Goods Sold',grossProfit:'Gross Profit',marketingExpense:'Marketing Expense',rdExpense:'R&D Expense',maintenanceExpense:'Maintenance Expense',managementExpense:'Management Expense',warehouseExpense:'Warehouse Expense',purchasingExpense:'Purchasing Expense',depreciation:'Depreciation',operatingExpenses:'Operating Expenses',operatingProfit:'Operating Profit',interestExpense:'Interest Expense',earningsBeforeTax:'Earnings Before Tax',tax:'Tax',netEarnings:'Net Earnings'}
};

function financialSection(title,section,values={}) {
  const fields=Object.keys(FINANCIAL_FIELDS[section]||{});
  return `<div class="official-financial-section"><h3>${esc(title)}</h3><div class="official-form-grid">${fields.map(key=>numberInput(FINANCIAL_LABELS[section]?.[key]||key,`officialFinancial_${section}_${key}`,whole(values?.[key]),{step:'1',suffix:'$'})).join('')}</div></div>`;
}
function evidenceItems(raw) { return !raw ? [] : (Array.isArray(raw) ? raw : [raw]); }

export function officialSyncView(state, requestedRound) {
  const max=Math.max(Number(state.maxRounds||4),5);
  const round=Math.min(max,Math.max(0,Number(requestedRound ?? (state.currentRound>0?state.currentRound:1))));
  const official=state.official||{};
  const environment=official.environments?.[String(round)]||{};
  const actual=official.actuals?.[String(round)]?.values||{};
  const officialFinancial=official.financials?.[String(round)]||{};
  const financial=officialFinancial.statement||{};
  const evidence=evidenceItems(official.evidence?.[String(round)]);
  const ocrAudit=official.ocr?.[String(round)]||null;
  const reconciliation=reconciliationForRound(state,round);
  const roundOptions=Array.from({length:max+1},(_,r)=>`<option value="${r}" ${r===round?'selected':''}>Round ${r}</option>`).join('');
  const financialCount=countFinancialFields(financial);

  const reconRows=reconciliation.map(item=>{
    const cls=item.diff>0?'good':item.diff<0?'bad':'neutral';
    const err=item.key==='marketShare'
      ? `${item.diff>=0?'+':''}${(item.diff*100).toFixed(2)}pp`
      : item.pctError===null ? '—' : `${item.pctError>=0?'+':''}${(item.pctError*100).toFixed(1)}%`;
    return [esc(label(item.key)),esc(format(item.key,item.predicted)),esc(format(item.key,item.actual)),`<span class="${cls}">${err}</span>`];
  });

  const confidence=Number.isFinite(Number(ocrAudit?.confidence)) ? Number(ocrAudit.confidence).toFixed(1)+'%' : '—';
  const packageScore=[environment.confirmed,Object.keys(actual).length>0,financialCount>0].filter(Boolean).length;

  return `
    <div class="page-head">
      <div><div class="eyebrow">COMPETITION DATA CONTROL</div><h1>Official Sync</h1><p class="subtitle">TopBoss tetap source of truth. MBS Arena memakai data resmi untuk simulasi, reconciliation, dan calibration ronde berikutnya.</p></div>
      <div class="actions"><select id="officialRoundSelect" class="top-control">${roundOptions}</select></div>
    </div>

    <div class="official-status-row">
      <span class="official-status ${environment.confirmed?'good-bg':'warn-bg'}">${environment.confirmed?`Environment R${round} confirmed`:`Environment R${round} not confirmed`}</span>
      <span class="official-status ${Object.keys(actual).length?'good-bg':''}">${Object.keys(actual).length?`Official actual · ${Object.keys(actual).length} fields`:'No official actual'}</span>
      <span class="official-status ${financialCount?'good-bg':''}">${financialCount?`Financial statement · ${financialCount} lines`:'No detailed financial statement'}</span>
      <span class="official-status">Round package ${packageScore}/3</span>
    </div>

    <section class="official-workflow">
      <div><b>1</b><span>Capture official data</span></div><div><b>2</b><span>Review OCR / paste draft</span></div><div><b>3</b><span>Captain confirms</span></div><div><b>4</b><span>Simulate & decide</span></div><div><b>5</b><span>Reconcile actual</span></div>
    </section>

    <section class="official-sync-grid">
      <div class="card">
        <div class="card-head"><div><span>TOPBOSS INPUT</span><h2>Economic Environment</h2></div></div>
        <div class="callout">Confirmed values override random/scenario conditions for this round.</div>
        <div class="official-form-grid">
          ${numberInput('Price Index','officialEnv_priceIndex',val(environment.priceIndex,2),{step:'0.01'})}
          ${numberInput('Economic Growth Factor','officialEnv_growth',val(environment.growth),{step:'0.001'})}
          ${numberInput('Seasonal Factor','officialEnv_seasonal',val(environment.seasonal),{step:'0.001'})}
          ${numberInput('Market Growth Factor','officialEnv_marketGrowth',val(environment.marketGrowth),{step:'0.001'})}
          ${numberInput('Raw Material Index','officialEnv_rawIndex',val(environment.rawIndex),{step:'0.001'})}
          ${numberInput('Demand Factor','officialEnv_demandFactor',val(environment.demandFactor),{step:'0.001'})}
          ${numberInput('Capacity Factor','officialEnv_capacityFactor',val(environment.capacityFactor),{step:'0.001'})}
          ${textInput('Official Event / Note','officialEnv_eventTitle',environment.eventTitle||'',{wide:true,placeholder:'e.g. Economic slowdown'})}
        </div>
        <div class="actions"><button class="primary" data-action="save-official-environment">Confirm Environment R${round}</button></div>
      </div>

      <div class="card">
        <div class="card-head"><div><span>ACTUAL RESULT</span><h2>Official Round Outcome</h2></div></div>
        <div class="callout">Prediction simulator disimpan sebelum official actual diadopsi sebagai live state.</div>
        <div class="official-form-grid">
          ${numberInput('Revenue','officialActual_revenue',whole(actual.revenue),{step:'1',suffix:'$'})}
          ${numberInput('Net Profit','officialActual_netProfit',whole(actual.netProfit),{step:'1',suffix:'$'})}
          ${numberInput('Sales','officialActual_sales',whole(actual.sales),{step:'1',suffix:'units'})}
          ${numberInput('Market Share','officialActual_marketShare',Number.isFinite(Number(actual.marketShare))?(Number(actual.marketShare)*100).toFixed(2):'',{step:'0.01',suffix:'%'})}
          ${numberInput('Selling Price','officialActual_price',Number.isFinite(Number(actual.price))?Number(actual.price).toFixed(2):'',{step:'0.01',suffix:'$'})}
          ${numberInput('Unit Cost','officialActual_unitCost',Number.isFinite(Number(actual.unitCost))?Number(actual.unitCost).toFixed(2):'',{step:'0.01',suffix:'$'})}
          ${numberInput('Cash','officialActual_cash',whole(actual.cash),{step:'1',suffix:'$'})}
          ${numberInput('Overdraft','officialActual_overdraft',whole(actual.overdraft),{step:'1',suffix:'$'})}
          ${numberInput('Equity','officialActual_equity',whole(actual.equity),{step:'1',suffix:'$'})}
          ${numberInput('Quality','officialActual_quality',val(actual.quality),{step:'0.001'})}
          ${numberInput('Image','officialActual_image',val(actual.image),{step:'0.001'})}
          ${numberInput('Potential Demand','officialActual_potentialDemand',whole(actual.potentialDemand),{step:'1',suffix:'units'})}
          ${numberInput('Production','officialActual_production',whole(actual.production),{step:'1',suffix:'units'})}
          ${numberInput('Capacity','officialActual_capacity',whole(actual.capacity),{step:'1',suffix:'units'})}
          ${numberInput('Raw Material','officialActual_rawMaterial',whole(actual.rawMaterial),{step:'1',suffix:'units'})}
          ${numberInput('Finished Goods','officialActual_finishedGoods',whole(actual.finishedGoods),{step:'1',suffix:'units'})}
        </div>
        <div class="actions"><button class="primary" data-action="save-official-actual">Save Actual + Adopt Live State</button></div>
      </div>
    </section>

    <section class="card official-intake-card">
      <div class="card-head"><div><span>VISION INTAKE BETA</span><h2>Multi-Screenshot OCR Draft</h2></div><div class="official-confidence">OCR confidence <strong id="officialOcrConfidence">${confidence}</strong></div></div>
      <div class="callout warn"><b>Review gate aktif.</b> OCR hanya mengisi draft form dan tidak pernah mengubah state sebelum Captain menekan Confirm/Save.</div>
      <div class="official-intake-grid">
        <div>
          <label class="field"><span>TopBoss screenshots (1–6 files)</span><input id="officialScreenshot" type="file" accept="image/*" multiple></label>
          <div class="actions"><button class="secondary" data-action="extract-official-ocr">Extract OCR Draft</button><button class="secondary" data-action="clear-official-ocr">Clear Intake</button></div>
          <div id="officialOcrStatus" class="tb-note">${ocrAudit?`Last extraction: ${ocrAudit.files||0} file(s), ${ocrAudit.detected||0} field(s), overall confidence ${confidence}. Human review still required.`:'Select screenshot(s), then Extract OCR Draft.'}</div>
          <div id="officialScreenshotBox" class="official-screenshot-box">${evidence.length?`Evidence history: ${evidence.length} file(s) stored as metadata.`:'Belum ada screenshot dipilih.'}</div>
        </div>
        <div>
          <label class="field"><span>OCR / copied text review buffer</span><textarea id="officialPaste" rows="12" placeholder="OCR text akan muncul di sini. Kamu juga bisa paste copied TopBoss table atau JSON secara langsung."></textarea></label>
          <div class="actions"><button class="secondary" data-action="parse-official-paste">Parse Review Buffer into Forms</button></div>
          <div class="tb-note">Structured copy/paste tetap lebih dipercaya daripada OCR. Koreksi digit yang janggal sebelum Save.</div>
        </div>
      </div>
    </section>

    <section class="card official-financial-card">
      <div class="card-head"><div><span>DETAILED ACTUALS</span><h2>Official Financial Statement</h2></div><div class="official-confidence">${financialCount} line(s) saved</div></div>
      <div class="callout">Manual entry, copied table, JSON, atau OCR draft dapat mengisi line item. Setelah Save, halaman Financial Statement memakai statement resmi untuk ronde tersebut.</div>
      <div class="official-financial-grid">
        ${financialSection('Balance Sheet','balanceSheet',financial.balanceSheet||{})}
        ${financialSection('Cash Flow','cashFlow',financial.cashFlow||{})}
        ${financialSection('Income Statement','incomeStatement',financial.incomeStatement||{})}
      </div>
      <div class="actions"><button class="primary" data-action="save-official-financial">Save Official Financial Statement R${round}</button></div>
    </section>

    <section class="card">
      <div class="card-head"><div><span>CHECK & RECHECK</span><h2>Predicted vs Official Actual</h2></div></div>
      ${reconRows.length?table(['Metric','Predicted','Official Actual','Error'],reconRows):'<div class="empty">Reconciliation muncul setelah prediction dan official actual tersedia untuk ronde yang sama.</div>'}
    </section>
  `;
}
