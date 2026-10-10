import { esc, fixed, money, num, pct } from './utils.js';
import { financialForRound } from './financialStatement.js';

const PALETTE = ['#2d9cdb','#f2c94c','#eb5757','#9b51e0','#27ae60','#f2994a','#56ccf2','#6fcf97','#bb6bd9','#4f4f4f'];

function userCompany(state) {
  return state.companies.find(company => company.isUser) || state.companies[0];
}

function snapshotFor(company, round) {
  const history = Array.isArray(company.history) ? company.history : [];
  return history.find(item => Number(item.round) === Number(round))
    || history.filter(item => Number(item.round) <= Number(round)).at(-1)
    || history.at(-1)
    || company;
}

function availableRounds(state) {
  const user = userCompany(state);
  const rows = Array.isArray(user.history) ? user.history : [];
  const rounds = [...new Set(rows.map(item => Number(item.round)).filter(Number.isFinite))].sort((a,b)=>a-b);
  return rounds.length ? rounds : [0];
}

function selectedRound(state, requested) {
  const rounds = availableRounds(state);
  if (requested === null || requested === undefined || requested === '') return Math.max(...rounds);
  const value = Number(requested);
  return rounds.includes(value) ? value : Math.max(...rounds);
}

function roundTabs(state, round) {
  const completed = new Set(availableRounds(state));
  const resultMax = state.mode === 'workbook' ? 5 : Number(state.maxRounds || 4);
  const resultTabs = Array.from({ length: resultMax + 1 }, (_, r) => {
    const enabled = completed.has(r);
    return `<button type="button" data-round-tab="${r}" class="${r===round?'active':''}" ${enabled?'':'disabled'}>R${r}</button>`;
  }).join('');
  const planTab = state.mode === 'workbook'
    ? `<button type="button" class="plan-tab" disabled>R6 Plan</button>`
    : '';
  return `<div class="tb-round-tabs" role="tablist" aria-label="Round selector">${resultTabs}${planTab}</div>`;
}

function page(title, subtitle, state, round, body, actions='') {
  return `
    <section class="tb-page">
      <div class="tb-page-head">
        <div>
          <h1>${esc(title)}</h1>
          <p>${esc(subtitle)}</p>
        </div>
        ${actions ? `<div class="tb-page-actions">${actions}</div>` : ''}
      </div>
      ${roundTabs(state, round)}
      ${body}
    </section>`;
}

function panel(title, content, extra='') {
  return `<section class="tb-panel ${extra}"><div class="tb-panel-head"><h2>${esc(title)}</h2></div><div class="tb-panel-body">${content}</div></section>`;
}

function dataTable(headers, rows, classes='') {
  return `<div class="tb-table-wrap"><table class="tb-table ${classes}"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td class="${cell?.className||''}">${cell?.html ?? esc(cell?.text ?? cell ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function lineChart(series, rounds, valueFormat = value => num(value), options = {}) {
  const width=720, height=230, padTop=24, padBottom=28, padLeft=82, padRight=24;
  const values=series.flatMap(s=>s.values).filter(Number.isFinite);
  const min=Math.min(...values,0), max=Math.max(...values,1), span=Math.max(max-min,1);
  const x=i=>padLeft+(rounds.length<=1?0:i*(width-padLeft-padRight)/(rounds.length-1));
  const y=v=>height-padBottom-((v-min)/span)*(height-padTop-padBottom);
  const grid=[0,.25,.5,.75,1].map(frac=>{
    const yy=padTop+frac*(height-padTop-padBottom);
    const val=max-frac*span;
    return `<g><line x1="${padLeft}" y1="${yy}" x2="${width-padRight}" y2="${yy}" class="tb-grid-line"/><text x="4" y="${yy+3}" class="tb-axis-label">${esc(valueFormat(val))}</text></g>`;
  }).join('');
  const paths=series.map((s,idx)=>{
    const color=PALETTE[idx%PALETTE.length];
    const pts=s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
    const dots=s.values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="${s.highlight?3.1:2.5}" fill="${color}" />`).join('');
    const pointLabels=options.pointLabels
      ? s.values.map((v,i)=>`<text x="${x(i)}" y="${Math.max(12,y(v)-9)}" text-anchor="middle" class="tb-point-label">${esc(valueFormat(v))}</text>`).join('')
      : '';
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${s.highlight?3:1.8}" opacity="${s.highlight?1:.78}"/>${dots}${pointLabels}`;
  }).join('');
  const labels=rounds.map((r,i)=>`<text x="${x(i)}" y="${height-7}" text-anchor="middle" class="tb-axis-label">R${r}</text>`).join('');
  const legend=series.map((s,idx)=>`<span><i style="background:${PALETTE[idx%PALETTE.length]}"></i>${esc(s.name)}</span>`).join('');
  return `<div class="tb-chart"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${grid}${paths}${labels}</svg><div class="tb-chart-legend">${legend}</div></div>`;
}

function barChart(items, formatter = value => num(value)) {
  const max=Math.max(...items.map(x=>Math.abs(x.value)),1);
  return `<div class="tb-bars">${items.map((item,idx)=>`
    <div class="tb-bar-row">
      <span>${esc(item.label)}</span>
      <div class="tb-bar-track"><div style="width:${Math.max(2,Math.abs(item.value)/max*100)}%;background:${PALETTE[idx%PALETTE.length]}"></div></div>
      <strong>${formatter(item.value)}</strong>
    </div>`).join('')}</div>`;
}

function pieChart(items) {
  const positives=items.map((x,idx)=>({
    ...x,
    value:Math.max(0,Number(x.value)||0),
    color:x.color || PALETTE[idx%PALETTE.length]
  }));
  const total=positives.reduce((sum,x)=>sum+x.value,0)||1;
  let cursor=0;
  const stops=positives.map(item=>{
    const start=cursor;
    cursor += item.value/total*100;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(',');
  return `<div class="tb-pie-wrap"><div class="tb-pie" style="background:conic-gradient(${stops})"></div><div class="tb-pie-legend">${positives.map(item=>`<span class="${item.isUser?'user':''}"><i style="background:${item.color}"></i>${esc(item.label)} <b>${pct(item.value)}</b></span>`).join('')}</div></div>`;
}

function marketShareItems(state, round) {
  const companies=state.companies.map(company=>({ company, share:Number(snapshotFor(company,round).marketShare)||0 }));
  const userRow=companies.find(x=>x.company.isUser);
  const userShare=Math.max(0,Math.min(1,userRow?.share||0));
  const bots=companies.filter(x=>!x.company.isUser);
  const botTotal=bots.reduce((sum,x)=>sum+Math.max(0,x.share),0)||1;
  const muted=['#aeb9c5','#bdc6cf','#c8d0d8','#98a7b6','#d0d6dc','#8999a9','#b4bec8','#c1c9d1','#a2afbc'];
  return [
    {label:userRow?.company.name||'MARKOWITZ',value:userShare,isUser:true,color:'#1f5f99'},
    ...bots.map((row,idx)=>({
      label:row.company.name,
      value:(Math.max(0,row.share)/botTotal)*(1-userShare),
      isUser:false,
      color:muted[idx%muted.length]
    }))
  ].sort((a,b)=>b.value-a.value);
}

function marketShareContext(state, round) {
  const items=marketShareItems(state,round);
  const user=items.find(x=>x.isUser);
  const rank=items.findIndex(x=>x.isUser)+1;
  const avg=1/Math.max(items.length,1);
  const gap=(user?.value||0)-avg;
  return { items, rank, avg, gap };
}

function currentSnapshot(state, round) {
  return snapshotFor(userCompany(state), round);
}

function deltaCell(current, previous, kind='pct') {
  if (!previous || !Number.isFinite(Number(previous))) return { html:'—', className:'tb-delta neutral' };
  const c=Number(current)||0, p=Number(previous)||0;
  let display='—', positive=c>=p;
  if (kind==='pp') {
    const diff=(c-p)*100;
    display=`${diff>=0?'▲':'▼'} ${Math.abs(diff).toFixed(2)}pp`;
  } else if (kind==='money') {
    const diff=c-p;
    display=`${diff>=0?'▲':'▼'} ${money(Math.abs(diff))}`;
  } else {
    const diff=p===0?null:(c-p)/Math.abs(p);
    display=diff===null?'—':`${diff>=0?'▲':'▼'} ${Math.abs(diff*100).toFixed(1)}%`;
    positive=diff===null?true:diff>=0;
  }
  return { html:display, className:`tb-delta ${positive?'up':'down'}` };
}

function rankTone(rank,total) {
  if (!Number.isFinite(rank) || !Number.isFinite(total) || total <= 0) return '';
  if (rank <= Math.max(3, Math.ceil(total * .3))) return 'good';
  if (rank >= Math.max(1, Math.floor(total * .7))) return 'bad';
  return 'warn';
}

function dashboardKpi(label,value,note='',tone='',noteTone='') {
  return `<div class="tb-kpi"><span>${esc(label)}</span><strong class="${tone}">${value}</strong><small class="${noteTone}">${esc(note)}</small></div>`;
}

function netProfitCompanion(company, rounds) {
  return `<div class="tb-companion-trend"><span class="label">Net profit</span>${rounds.map(r=>{
    const value=Number(snapshotFor(company,r).netProfit||0);
    return `<span class="item"><b>R${r}</b><strong class="${value>=0?'good':'bad'}">${money(value)}</strong></span>`;
  }).join('')}</div>`;
}

export function parityDashboardView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const company=userCompany(state);
  const user=currentSnapshot(state,round);
  const completed=availableRounds(state);
  const prevRound=completed.filter(r=>r<round).at(-1);
  const previous=Number.isFinite(prevRound) ? snapshotFor(company,prevRound) : null;
  const companies=state.companies.map(c=>({company:c,s:snapshotFor(c,round)}));
  const ranked=[...companies].sort((a,b)=>(b.s.npv||0)-(a.s.npv||0));
  const npvRank=ranked.findIndex(x=>x.company.isUser)+1;
  const shareCtx=marketShareContext(state,round);

  const summaryRows=[
    [{text:'Revenue'},{html:money(user.revenue)},deltaCell(user.revenue,previous?.revenue)],
    [{text:'Net profit'},{html:money(user.netProfit),className:user.netProfit>=0?'good':'bad'},deltaCell(user.netProfit,previous?.netProfit)],
    [{text:'Market share'},{html:pct(user.marketShare)},deltaCell(user.marketShare,previous?.marketShare,'pp')],
    [{text:'Unit cost'},{html:money(user.unitCost)},deltaCell(user.unitCost,previous?.unitCost,'money')],
    [{text:'Selling price'},{html:money(user.price)},deltaCell(user.price,previous?.price,'money')],
    [{text:'Cash'},{html:money(user.cash)},deltaCell(user.cash,previous?.cash)],
    [{text:'Practice NPV',className:'tb-primary-row'},{html:money(user.npv),className:'tb-primary-row'},deltaCell(user.npv,previous?.npv)],
    [{text:'Rank'},{html:`#${npvRank} / ${state.companies.length}`},{html:'—',className:'tb-delta neutral'}]
  ];

  const revenueBlock = completed.length < 2
    ? `<div class="tb-trend-empty"><span>Revenue R0</span><strong>${money(user.revenue)}</strong><p>Trend muncul setelah Round 1.</p></div>`
    : `${lineChart([{
        name:company.name,
        values:completed.map(r=>snapshotFor(company,r).revenue||0),
        highlight:true
      }],completed,v=>money(v),{pointLabels:true})}${netProfitCompanion(company,completed)}`;

  return page('Management Dashboard','Compact operating and financial overview aligned to the recorded MBS layout.',state,round,`
    <div class="tb-kpi-strip">
      ${dashboardKpi('Practice NPV',money(user.npv),`Rank #${npvRank}/${state.companies.length}`,'',rankTone(npvRank,state.companies.length))}
      ${dashboardKpi('Net Profit',money(user.netProfit),`Round ${round}`,user.netProfit>=0?'good':'bad')}
      ${dashboardKpi('Market Share',pct(user.marketShare),`Rank #${shareCtx.rank}/${state.companies.length}`,'',rankTone(shareCtx.rank,state.companies.length))}
      ${dashboardKpi('Cash',money(user.cash),user.overdraft>0?`Overdraft ${money(user.overdraft)}`:'No overdraft')}
      ${dashboardKpi('Unit Cost',money(user.unitCost),`Price ${money(user.price)}`,user.unitCost>user.price?'bad':'')}
    </div>
    <div class="tb-dashboard-grid">
      ${panel('Business Summary',dataTable(['Measure','Value','Δ vs prior'],summaryRows),'tb-span-4')}
      ${panel('Revenue Trend',revenueBlock,'tb-span-8')}
      ${panel('Market Share',`${pieChart(shareCtx.items)}<div class="tb-share-meta"><span>Share rank <b>#${shareCtx.rank}/${state.companies.length}</b></span><span>Market average <b>${pct(shareCtx.avg)}</b></span><span>vs average <b class="${shareCtx.gap>=0?'good':'bad'}">${shareCtx.gap>=0?'+':''}${(shareCtx.gap*100).toFixed(2)}pp</b></span></div>`,'tb-span-5')}
      ${panel('Operating Position',dataTable(['Measure','Value'],[
        [{text:'Potential demand'},{html:num(user.potentialDemand)}],
        [{text:'Sales'},{html:num(user.sales)}],
        [{text:'Production'},{html:num(user.production)}],
        [{text:'Finished goods'},{html:num(user.finishedGoods)}],
        [{text:'Raw material'},{html:num(user.rawMaterial)}],
        [{text:'Capacity'},{html:num(user.capacity)}]
      ]),'tb-span-7')}
    </div>
  `,`<button class="tb-btn" data-action="export-save">Export Save</button><button class="tb-btn primary" data-action="goto-decisions">Next Decision</button>`);
}

export function economicEnvironmentView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const s=currentSnapshot(state,round);
  const e=s.economy||{};
  const rows=[
    ['Price index',fixed(e.priceIndex ?? 100,2)],
    ['Economic growth factor',fixed(e.growth ?? 1,3)],
    ['Seasonal factor',fixed(e.seasonal ?? 1,3)],
    ['Market growth factor',fixed(e.marketGrowth ?? 1,3)],
    ['Raw material index',fixed(e.rawIndex ?? 1,3)],
    ['Scenario / event',e.event?.title || s.event?.title || 'No event']
  ].map(([a,b])=>[{text:a},{text:String(b)}]);
  return page('Economic Environment','External conditions recorded by the practice engine for the selected round.',state,round,
    panel('Environment Indicators',dataTable(['Indicator','Round '+round],rows))+
    `<div class="tb-note">Only variables actually stored by the simulator are shown. Missing TopBoss variables are not invented.</div>`
  );
}

export function businessStatusView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const s=currentSnapshot(state,round);
  const rows=[
    ['Potential demand',num(s.potentialDemand)],
    ['Actual sales',num(s.sales)],
    ['Finished goods',num(s.finishedGoods)],
    ['Production',num(s.production)],
    ['Beginning capacity',num(s.beginCapacity ?? s.capacity)],
    ['Maximum production capacity',num(s.maxProductionCapacity ?? (s.capacity||0)*1.5)],
    ['Ending / next capacity',num(s.capacity)],
    ['Beginning raw material',num(s.beginRawMaterial ?? s.rawMaterial)],
    ['Procurement delivered',num(s.procurementDelivered ?? 0)],
    ['Ending raw material',num(s.rawMaterial)],
    ['Conversion factor',fixed(s.conversionFactor ?? 0,3)]
  ].map(([a,b])=>[{text:a},{text:b}]);
  return page('Business Status','Round-specific operating status, demand, inventory, production, and capacity.',state,round,
    `<div class="tb-two-col">${panel('Business Status',dataTable(['Measure','Value'],rows))}${panel('Demand vs Supply',barChart([
      {label:'Potential demand',value:s.potentialDemand||0},
      {label:'Sales',value:s.sales||0},
      {label:'Production',value:s.production||0},
      {label:'Capacity',value:s.capacity||0}
    ]))}</div>`
  );
}

export function productImageView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const rows=state.companies.map((company,idx)=>{
    const s=snapshotFor(company,round);
    return [
      {html:`<span class="${company.isUser?'tb-user-dot':''}">${esc(company.name)}</span>`},
      {html:fixed(s.quality,3)},
      {html:fixed(s.image,3)},
      {html:money(s.price)}
    ];
  });
  const points=state.companies.map((company,idx)=>{
    const s=snapshotFor(company,round);
    const x=8+(Number(s.quality||0)*84);
    const y=92-(Number(s.image||0)*84);
    const color=company.isUser ? '#1f5f99' : '#aeb9c5';
    return `<g><circle cx="${x}" cy="${y}" r="${company.isUser?3.1:2}" fill="${color}"/><text x="${x+2.5}" y="${y-2}" class="tb-scatter-label">${esc(company.name)}</text></g>`;
  }).join('');
  const scatter=`<div class="tb-scatter"><svg viewBox="0 0 100 100"><line x1="8" y1="92" x2="95" y2="92"/><line x1="8" y1="92" x2="8" y2="5"/>${points}<text x="50" y="99" class="tb-scatter-axis">Quality →</text><text x="1" y="50" class="tb-scatter-axis" transform="rotate(-90 1 50)">Image →</text></svg></div>`;
  return page('Product Image','Competitive positioning using the quality and image variables available in the simulator.',state,round,
    `<div class="tb-two-col">${panel('Quality / Image Positioning',scatter)}${panel('Company Position',dataTable(['Company','Quality','Image','Price'],rows))}</div>`
  );
}

export function marketShareView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const ctx=marketShareContext(state,round);
  const shareByName=new Map(ctx.items.map(item=>[item.label,item.value]));
  const rows=state.companies
    .map(company=>{
      const s=snapshotFor(company,round);
      return { company, s, displayShare:shareByName.get(company.name) ?? Number(s.marketShare||0) };
    })
    .sort((a,b)=>b.displayShare-a.displayShare)
    .map(({company,s,displayShare})=>[
      {html:`<span class="${company.isUser?'tb-user-dot':''}">${esc(company.name)}</span>`},
      {html:pct(displayShare)},
      {html:num(s.sales)},
      {html:money(s.revenue)}
    ]);
  return page('Market Share','Overall market-share view derived from company results in the selected round.',state,round,
    `<div class="tb-two-col">${panel('Overall Market Share',`${pieChart(ctx.items)}<div class="tb-share-meta"><span>MARKOWITZ rank <b>#${ctx.rank}/${state.companies.length}</b></span><span>Market average <b>${pct(ctx.avg)}</b></span><span>vs average <b class="${ctx.gap>=0?'good':'bad'}">${ctx.gap>=0?'+':''}${(ctx.gap*100).toFixed(2)}pp</b></span></div>`)}${panel('Share Table',dataTable(['Company','Share','Sales','Revenue'],rows))}</div>`
  );
}

export function revenueStatusView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const rounds=availableRounds(state);
  const company=userCompany(state);
  const series=[
    {name:'Revenue',values:rounds.map(r=>snapshotFor(company,r).revenue||0),highlight:true},
    {name:'Net profit',values:rounds.map(r=>snapshotFor(company,r).netProfit||0)}
  ];
  const rows=state.companies.map(c=>{
    const s=snapshotFor(c,round);
    return [{html:`<span class="${c.isUser?'tb-user-dot':''}">${esc(c.name)}</span>`},{html:money(s.revenue)},{html:num(s.sales)},{html:money(s.netProfit),className:s.netProfit>=0?'good':'bad'}];
  });
  return page('Revenue / Sales Status','Revenue, sales volume, and profitability by company and across rounds.',state,round,
    `${panel('Revenue and Profit Trend',lineChart(series,rounds,v=>money(v)))}${panel('Company Revenue Status',dataTable(['Company','Revenue','Sales','Net Profit'],rows))}`
  );
}

export function salesTrendView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const rounds=availableRounds(state);
  const c=userCompany(state);
  const series=[
    {name:'Potential demand',values:rounds.map(r=>snapshotFor(c,r).potentialDemand||0)},
    {name:'Sales',values:rounds.map(r=>snapshotFor(c,r).sales||0),highlight:true},
    {name:'Production',values:rounds.map(r=>snapshotFor(c,r).production||0)}
  ];
  const rows=rounds.map(r=>{
    const s=snapshotFor(c,r);
    return [{text:'R'+r},{html:num(s.potentialDemand)},{html:num(s.sales)},{html:num(s.production)},{html:pct(s.marketShare)}];
  });
  return page('Sales Trend','Demand, sales, production, and share movement across completed rounds.',state,round,
    `${panel('Demand / Sales / Production',lineChart(series,rounds,v=>num(v)))}${panel('Round Data',dataTable(['Round','Demand','Sales','Production','Share'],rows))}`
  );
}

export function productionLogisticsView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const s=currentSnapshot(state,round);
  const rows=[
    ['Beginning capacity',s.beginCapacity ?? s.capacity],
    ['Normal capacity',s.beginCapacity ?? s.capacity],
    ['Maximum production capacity',s.maxProductionCapacity ?? (s.capacity||0)*1.5],
    ['Production',s.production],
    ['Capacity utilization',Math.min(1,(s.production||0)/Math.max(s.beginCapacity||s.capacity||1,1)),'pct'],
    ['Beginning raw material',s.beginRawMaterial ?? s.rawMaterial],
    ['Procurement delivered',s.procurementDelivered ?? 0],
    ['Ending raw material',s.rawMaterial],
    ['Finished goods',s.finishedGoods],
    ['Current conversion factor',s.conversionFactor ?? 0,'fixed'],
    ['Next conversion factor',s.nextConversionFactor ?? s.conversionFactor ?? 0,'fixed']
  ].map(([a,b,t])=>[{text:a},{html:t==='pct'?pct(b):t==='fixed'?fixed(b,3):num(b)}]);
  return page('Production & Logistics','Production, materials, inventory, capacity, and conversion-factor control.',state,round,
    `<div class="tb-two-col">${panel('Operating Detail',dataTable(['Measure','Value'],rows))}${panel('Capacity / Flow',barChart([
      {label:'Production',value:s.production||0},
      {label:'Normal capacity',value:s.beginCapacity||s.capacity||0},
      {label:'Max capacity',value:s.maxProductionCapacity||(s.capacity||0)*1.5},
      {label:'Raw material',value:s.rawMaterial||0},
      {label:'Finished goods',value:s.finishedGoods||0}
    ]))}</div>`
  );
}

export function costStructureView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const s=currentSnapshot(state,round);
  const f=s.financial||{};
  const income=f.incomeStatement||{};
  const decision=s.decision||{};
  const rows=[
    ['Selling price',money(s.price)],
    ['Unit cost',money(s.unitCost)],
    ['Unit margin',money((s.price||0)-(s.unitCost||0))],
    ['Cost of goods sold',money(income.costOfGoodsSold ?? ((s.unitCost||0)*(s.sales||0)))],
    ['Marketing',money(income.marketing ?? decision.marketing ?? 0)],
    ['R&D',money(income.rd ?? decision.rd ?? 0)],
    ['Maintenance',money(income.maintenance ?? decision.maintenance ?? 0)],
    ['Management',money(income.management ?? 0)],
    ['Depreciation',money(income.depreciation ?? 0)],
    ['Warehouse',money(income.warehouse ?? 0)],
    ['Purchasing',money(income.purchasing ?? 0)],
    ['Interest',money(income.interest ?? 0)],
    ['Net profit',money(s.netProfit)]
  ].map(([a,b])=>[{text:a},{html:b}]);
  return page('Cost Structure','Compact cost and unit-economics view using stored financial lines when available.',state,round,
    `<div class="tb-two-col">${panel('Cost Detail',dataTable(['Cost Item','Amount'],rows))}${panel('Unit Economics',barChart([
      {label:'Selling price',value:s.price||0},
      {label:'Unit cost',value:s.unitCost||0},
      {label:'Unit margin',value:(s.price||0)-(s.unitCost||0)}
    ],v=>money(v)))}</div>`
  );
}

const METRICS = {
  marketShare:{label:'Market Share',format:pct},
  revenue:{label:'Revenue',format:money},
  sales:{label:'Sales',format:num},
  price:{label:'Price',format:money},
  quality:{label:'Quality',format:v=>fixed(v,3)},
  image:{label:'Image',format:v=>fixed(v,3)},
  netProfit:{label:'Net Profit',format:money},
  unitCost:{label:'Unit Cost',format:money},
  npv:{label:'Practice NPV',format:money}
};

export function competitiveAnalysisView(state, requestedRound, metricKey='marketShare') {
  const round=selectedRound(state,requestedRound);
  const rounds=availableRounds(state);
  const metric=METRICS[metricKey]||METRICS.marketShare;
  const series=state.companies.map(c=>({
    name:c.name,
    values:rounds.map(r=>Number(snapshotFor(c,r)[metricKey]||0)),
    highlight:Boolean(c.isUser)
  }));
  const rows=state.companies.map(c=>[
    {html:`<span class="${c.isUser?'tb-user-dot':''}">${esc(c.name)}</span>`},
    ...rounds.map(r=>({html:metric.format(Number(snapshotFor(c,r)[metricKey]||0))}))
  ]);
  const options=Object.entries(METRICS).map(([key,item])=>`<option value="${key}" ${key===metricKey?'selected':''}>${esc(item.label)}</option>`).join('');
  return page('Competitive Analysis','Compare company performance across rounds using the recorded-screen interaction pattern.',state,round,
    `<div class="tb-filter-row"><label>Metric <select id="competitiveMetric">${options}</select></label></div>
     ${panel(metric.label+' by Company',lineChart(series,rounds,metric.format))}
     ${panel('Competitor Table',dataTable(['Company',...rounds.map(r=>'R'+r)],rows))}`
  );
}

export function performanceTreeView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const s=currentSnapshot(state,round);
  return page('Decision / Performance Tree','Parity-inspired causal map. This is explanatory training logic, not a proprietary TopBoss formula.',state,round,
    panel('Decision Impact Map',`
      <div class="tb-tree">
        <div class="tb-tree-level"><span>Price</span><span>Marketing</span><span>R&D</span><span>Production</span><span>Cost Control</span></div>
        <div class="tb-tree-arrow">↓</div>
        <div class="tb-tree-level"><span>Demand</span><span>Image</span><span>Quality</span><span>Availability</span><span>Unit Cost</span></div>
        <div class="tb-tree-arrow">↓</div>
        <div class="tb-tree-level"><span>Sales</span><span>Market Share</span><span>Revenue</span><span>Net Profit</span></div>
        <div class="tb-tree-arrow">↓</div>
        <div class="tb-tree-level emph"><span>Cash ${money(s.cash)}</span><span>Equity ${money(s.equity)}</span><span>Practice NPV ${money(s.npv)}</span></div>
      </div>
      <div class="tb-note">Relationships are conceptual training links. Exact proprietary equations remain unknown.</div>
    `)
  );
}

export function parityDecisionHistoryView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const user=userCompany(state);
  const rounds=availableRounds(state);
  const variables=[
    ['Price',s=>money(s.decision?.price ?? s.price)],
    ['Marketing',s=>money(s.decision?.marketing ?? 0)],
    ['R&D',s=>money(s.decision?.rd ?? 0)],
    ['Production',s=>num(s.decision?.production ?? s.production)],
    ['Material Purchase',s=>money(s.decision?.materialPurchase ?? 0)],
    ['Equipment',s=>money(s.decision?.equipment ?? 0)],
    ['Maintenance',s=>money(s.decision?.maintenance ?? 0)],
    ['Dividend',s=>money(s.decision?.dividend ?? 0)],
    ['Sales',s=>num(s.sales)],
    ['Revenue',s=>money(s.revenue)],
    ['Unit Cost',s=>money(s.unitCost)],
    ['Net Profit',s=>money(s.netProfit)]
  ];
  const rows=variables.map(([label,fn])=>[
    {text:label},
    ...rounds.map(r=>({html:fn(snapshotFor(user,r)),className:r===round?'tb-selected-col':''}))
  ]);
  return page('Decision History','Decision and result matrix with rounds presented as columns, matching the recorded table-heavy workflow.',state,round,
    panel('Round Decision Matrix',dataTable(['Variable',...rounds.map(r=>'Round '+r)],rows))
  );
}


function ratioDisplay(value, kind='number') {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'n/a';
  const v=Number(value);
  return kind==='pct' ? pct(v) : fixed(v,2);
}

export function parityFinancialRatioView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const result=financialForRound(state,round);
  const ratios=result?.statement?.ratios||{};
  const rows=[
    ['Current Ratio',ratioDisplay(ratios.currentRatio)],
    ['Quick Ratio',ratioDisplay(ratios.quickRatio)],
    ['Inventory Turnover',ratioDisplay(ratios.inventoryTurnover)],
    ['Fixed Asset Turnover',ratioDisplay(ratios.fixedAssetTurnover)],
    ['Total Asset Turnover',ratioDisplay(ratios.totalAssetTurnover)],
    ['Debt Ratio',ratioDisplay(ratios.debtRatio,'pct')],
    ['Times Interest Earned',ratioDisplay(ratios.timesInterestEarned)],
    ['Net Profit Margin',ratioDisplay(ratios.netProfitMargin,'pct')],
    ['Basic Profit Margin',ratioDisplay(ratios.basicProfitMargin,'pct')],
    ['ROA',ratioDisplay(ratios.roa,'pct')],
    ['ROE',ratioDisplay(ratios.roe,'pct')],
    ['ROCE',ratioDisplay(ratios.roce,'pct')]
  ].map(([a,b])=>[{text:a},{html:b}]);
  return page('Financial Ratio','Compact financial-ratio report for the selected completed round.',state,round,
    panel('Financial Ratios',dataTable(['Ratio','Value'],rows))+
    `<div class="tb-note">${result?.isDerived?'Some line items for this legacy round are transparently reconstructed by the practice model.':'Ratios use the stored financial object for this simulated round.'}</div>`
  );
}

function statementRows(entries) {
  return entries.map(([label,value,total=false])=>[
    {html:total?`<strong>${esc(label)}</strong>`:esc(label)},
    {html:total?`<strong>${money(value)}</strong>`:money(value),className:Number(value)<0?'bad':''}
  ]);
}

export function parityFinancialStatementView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const result=financialForRound(state,round);
  if(!result) return page('Financial Statement','No financial statement is available yet.',state,round,'<div class="tb-note">Submit a round first.</div>');
  const s=result.statement;
  const bs=s.balanceSheet||{}, cf=s.cashFlow||{}, is=s.incomeStatement||{};
  const balanceRows=statementRows([
    ['Cash',bs.cash],['Raw material inventory',bs.rawMaterialInventory],['Finished goods inventory',bs.finishedGoodsInventory],
    ['Current assets',bs.currentAssets,true],['Fixed and other assets',bs.fixedAndOtherAssets],['Total assets',bs.totalAssets,true],
    ['Operating liabilities',bs.operatingLiabilities],['Overdraft',bs.overdraft],['Total liabilities',bs.totalLiabilities,true],
    ["Owners' equity",bs.ownersEquity],['Liabilities + equity',bs.totalLiabilitiesAndEquity,true]
  ]);
  const cashRows=statementRows([
    ['Beginning cash',cf.beginningCash],['Revenue / receipts',cf.revenue],['Cash expenditure',cf.cashExpenditure],
    ['Operating cash flow',cf.operatingCashFlow,true],['Raw material purchase',cf.rawMaterialPurchase],
    ['Equipment investment',cf.equipmentInvestment],['Dividend',cf.dividend],['Cash before financing',cf.cashBeforeFinancing,true],
    ['Overdraft financing',cf.overdraft],['Ending cash',cf.endingCash,true]
  ]);
  const incomeRows=statementRows([
    ['Revenue',is.revenue],['Cost of goods sold',is.costOfGoodsSold],['Gross profit',is.grossProfit,true],
    ['Marketing expense',is.marketingExpense],['R&D expense',is.rdExpense],['Maintenance expense',is.maintenanceExpense],
    ['Management expense',is.managementExpense],['Warehouse expense',is.warehouseExpense],['Purchasing expense',is.purchasingExpense],
    ['Depreciation',is.depreciation],['Operating expenses',is.operatingExpenses,true],['Operating profit',is.operatingProfit,true],
    ['Interest expense',is.interestExpense],['Earnings before tax',is.earningsBeforeTax,true],['Tax',is.tax],['Net earnings',is.netEarnings,true]
  ]);
  return page('Financial Statement','Three-column statement layout aligned to the financial pages visible in the recording.',state,round,
    `<div class="tb-financial-grid">${panel('Balance Sheet',dataTable(['Account','Amount'],balanceRows))}${panel('Cash Flow',dataTable(['Account','Amount'],cashRows))}${panel('Income Statement',dataTable(['Account','Amount'],incomeRows))}</div>
     <div class="tb-note">${result.isDerived?'Derived legacy detail: reconstructed transparently because this saved round predates line-item storage.':'Stored simulated financial detail.'}</div>`
  );
}
