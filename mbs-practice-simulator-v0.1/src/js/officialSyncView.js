import { reconciliationForRound } from './officialSync.js';
import { esc, fixed, money, num, pct } from './utils.js';

function input(label,id,value='',opts={}) {
  const step=opts.step || 'any';
  const suffix=opts.suffix ? `<span class="official-suffix">${esc(opts.suffix)}</span>` : '';
  return `<label class="official-field"><span>${esc(label)}</span><div><input id="${id}" type="number" step="${step}" value="${value ?? ''}" placeholder="${esc(opts.placeholder||'')}">${suffix}</div></label>`;
}

function val(value,digits=3) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '';
}
function whole(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : '';
}
function format(key,value) {
  if (key==='marketShare') return pct(value);
  if (['revenue','netProfit','cash','overdraft','equity','price','unitCost'].includes(key)) return money(value);
  if (['quality','image'].includes(key)) return fixed(value,3);
  return num(value);
}
function label(key) {
  const map={
    revenue:'Revenue',netProfit:'Net Profit',sales:'Sales',marketShare:'Market Share',
    price:'Selling Price',unitCost:'Unit Cost',cash:'Cash',overdraft:'Overdraft',
    equity:'Equity',quality:'Quality',image:'Image',potentialDemand:'Potential Demand',
    production:'Production',capacity:'Capacity',rawMaterial:'Raw Material',finishedGoods:'Finished Goods'
  };
  return map[key]||key;
}
function table(headers,rows) {
  return `<div class="tb-table-wrap"><table class="tb-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function officialSyncView(state, requestedRound) {
  const max=Math.max(Number(state.maxRounds||4),5);
  const round=Math.min(max,Math.max(0,Number(requestedRound ?? (state.currentRound>0?state.currentRound:1))));
  const official=state.official||{};
  const environment=official.environments?.[String(round)]||{};
  const actual=official.actuals?.[String(round)]?.values||{};
  const evidence=official.evidence?.[String(round)]||null;
  const reconciliation=reconciliationForRound(state,round);
  const roundOptions=Array.from({length:max+1},(_,r)=>`<option value="${r}" ${r===round?'selected':''}>Round ${r}</option>`).join('');

  const reconRows=reconciliation.map(item=>{
    const cls=item.diff>0?'good':item.diff<0?'bad':'neutral';
    const err=item.key==='marketShare'
      ? `${item.diff>=0?'+':''}${(item.diff*100).toFixed(2)}pp`
      : item.pctError===null ? '—' : `${item.pctError>=0?'+':''}${(item.pctError*100).toFixed(1)}%`;
    return [esc(label(item.key)),esc(format(item.key,item.predicted)),esc(format(item.key,item.actual)),`<span class="${cls}">${err}</span>`];
  });

  return `
    <div class="page-head">
      <div><div class="eyebrow">COMPETITION DATA CONTROL</div><h1>Official Sync</h1><p class="subtitle">Data resmi TopBoss menjadi source of truth. Prediction simulator tetap disimpan terpisah untuk check, reconciliation, dan calibration.</p></div>
      <div class="actions"><select id="officialRoundSelect" class="top-control">${roundOptions}</select></div>
    </div>

    <div class="official-status-row">
      <span class="official-status ${environment.confirmed?'good-bg':'warn-bg'}">${environment.confirmed?`Official environment active for R${round}`:`No official environment override for R${round}`}</span>
      <span class="official-status ${Object.keys(actual).length?'good-bg':''}">${Object.keys(actual).length?`Official actual stored · ${Object.keys(actual).length} fields`:'No official actual result stored'}</span>
    </div>

    <section class="official-sync-grid">
      <div class="card">
        <div class="card-head"><div><span>TOPBOSS INPUT</span><h2>Economic Environment</h2></div></div>
        <div class="callout">Nilai yang dikonfirmasi di sini menggantikan random/scenario environment simulator untuk ronde yang sama.</div>
        <div class="official-form-grid">
          ${input('Price Index','officialEnv_priceIndex',val(environment.priceIndex,2),{step:'0.01'})}
          ${input('Economic Growth Factor','officialEnv_growth',val(environment.growth),{step:'0.001'})}
          ${input('Seasonal Factor','officialEnv_seasonal',val(environment.seasonal),{step:'0.001'})}
          ${input('Market Growth Factor','officialEnv_marketGrowth',val(environment.marketGrowth),{step:'0.001'})}
          ${input('Raw Material Index','officialEnv_rawIndex',val(environment.rawIndex),{step:'0.001'})}
          ${input('Demand Factor','officialEnv_demandFactor',val(environment.demandFactor),{step:'0.001'})}
          ${input('Capacity Factor','officialEnv_capacityFactor',val(environment.capacityFactor),{step:'0.001'})}
          <label class="official-field official-wide"><span>Official Event / Note</span><div><input id="officialEnv_eventTitle" type="text" value="${esc(environment.eventTitle||'')}" placeholder="e.g. Economic slowdown"></div></label>
        </div>
        <div class="actions"><button class="primary" data-action="save-official-environment">Apply Official Environment to R${round}</button></div>
      </div>

      <div class="card">
        <div class="card-head"><div><span>ACTUAL RESULT</span><h2>Official Round Outcome</h2></div></div>
        <div class="callout">Setelah TopBoss memproses ronde, simpan outcome resmi. Nilai ini menjadi live state untuk keputusan berikutnya; prediction lama tetap tersimpan untuk menghitung error.</div>
        <div class="official-form-grid">
          ${input('Revenue','officialActual_revenue',whole(actual.revenue),{step:'1',suffix:'$'})}
          ${input('Net Profit','officialActual_netProfit',whole(actual.netProfit),{step:'1',suffix:'$'})}
          ${input('Sales','officialActual_sales',whole(actual.sales),{step:'1',suffix:'units'})}
          ${input('Market Share','officialActual_marketShare',Number.isFinite(Number(actual.marketShare))?(Number(actual.marketShare)*100).toFixed(2):'',{step:'0.01',suffix:'%'})}
          ${input('Selling Price','officialActual_price',Number.isFinite(Number(actual.price))?Number(actual.price).toFixed(2):'',{step:'0.01',suffix:'$'})}
          ${input('Unit Cost','officialActual_unitCost',Number.isFinite(Number(actual.unitCost))?Number(actual.unitCost).toFixed(2):'',{step:'0.01',suffix:'$'})}
          ${input('Cash','officialActual_cash',whole(actual.cash),{step:'1',suffix:'$'})}
          ${input('Overdraft','officialActual_overdraft',whole(actual.overdraft),{step:'1',suffix:'$'})}
          ${input('Equity','officialActual_equity',whole(actual.equity),{step:'1',suffix:'$'})}
          ${input('Quality','officialActual_quality',val(actual.quality),{step:'0.001'})}
          ${input('Image','officialActual_image',val(actual.image),{step:'0.001'})}
          ${input('Potential Demand','officialActual_potentialDemand',whole(actual.potentialDemand),{step:'1',suffix:'units'})}
          ${input('Production','officialActual_production',whole(actual.production),{step:'1',suffix:'units'})}
          ${input('Capacity','officialActual_capacity',whole(actual.capacity),{step:'1',suffix:'units'})}
          ${input('Raw Material','officialActual_rawMaterial',whole(actual.rawMaterial),{step:'1',suffix:'units'})}
          ${input('Finished Goods','officialActual_finishedGoods',whole(actual.finishedGoods),{step:'1',suffix:'units'})}
        </div>
        <div class="actions"><button class="primary" data-action="save-official-actual">Save Actual + Adopt as Live State</button></div>
      </div>
    </section>

    <section class="card official-intake-card">
      <div class="card-head"><div><span>FAST INTAKE</span><h2>Paste / Screenshot Evidence</h2></div></div>
      <div class="official-intake-grid">
        <div>
          <label class="field"><span>Paste TopBoss text / copied table / JSON</span><textarea id="officialPaste" rows="10" placeholder="Economic Growth Factor: 1.05&#10;Raw Material Index: 1.12&#10;Revenue: 1,868,595&#10;Net Profit: -434,646&#10;Market Share: 6.99%"></textarea></label>
          <div class="actions"><button class="secondary" data-action="parse-official-paste">Parse into form</button></div>
          <div class="tb-note">Copy/paste atau export terstruktur lebih aman daripada OCR saat lomba. Hasil parsing tetap harus diperiksa sebelum Save.</div>
        </div>
        <div>
          <label class="field"><span>Screenshot evidence</span><input id="officialScreenshot" type="file" accept="image/*"></label>
          <div id="officialScreenshotBox" class="official-screenshot-box">${evidence?`Evidence terakhir: ${esc(evidence.name)}`:'Belum ada screenshot dipilih.'}</div>
          <div class="tb-note"><b>Screenshot tidak auto-commit.</b> OCR/Vision sebaiknya hanya menghasilkan draft + confidence score, lalu manusia mengonfirmasi angka sebelum memengaruhi simulator.</div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><div><span>CHECK & RECHECK</span><h2>Predicted vs Official Actual</h2></div></div>
      ${reconRows.length?table(['Metric','Predicted','Official Actual','Error'],reconRows):'<div class="empty">Reconciliation muncul setelah prediction dan official actual tersedia untuk ronde yang sama.</div>'}
    </section>
  `;
}
