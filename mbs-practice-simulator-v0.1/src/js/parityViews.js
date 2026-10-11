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
    return `<button type="button" data-round-tab="${r}" class="${r===round?'active':''}" ${enabled?'':'disabled'} title="${enabled ? 'Lihat hasil Round '+r : 'Belum dimainkan'}">R${r}</button>`;
  }).join('');
  const planTab = state.mode === 'workbook'
    ? `<button type="button" class="plan-tab" disabled title="R6 adalah planning-only; tidak menghasilkan simulated result.">R6 Plan</button>`
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

function niceStep(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

function compactNumberAxis(value) {
  const v=Number(value)||0;
  const sign=v<0?'-':'';
  const abs=Math.abs(v);
  if (abs >= 1000000) {
    const scaled=abs/1000000;
    return sign + (Number.isInteger(scaled)?scaled.toFixed(0):scaled.toFixed(1)) + 'M';
  }
  if (abs >= 1000) return sign + Math.round(abs/1000) + 'k';
  return sign + Math.round(abs).toLocaleString('en-US');
}

function compactMoneyAxis(value) {
  const v=Number(value)||0;
  const sign=v<0?'-':'';
  const dollar=String.fromCharCode(36);
  const abs=Math.abs(v);
  if (abs >= 1000000) {
    const scaled=abs/1000000;
    return sign + dollar + (Number.isInteger(scaled)?scaled.toFixed(0):scaled.toFixed(1)) + 'M';
  }
  if (abs >= 1000) return sign + dollar + Math.round(abs/1000) + 'k';
  return sign + dollar + Math.round(abs).toLocaleString('en-US');
}

function lineChart(series, rounds, valueFormat = value => num(value), options = {}) {
  const width=720, height=230, padTop=28, padBottom=30, padLeft=104, padRight=34;
  const values=series.flatMap(s=>s.values).map(Number).filter(Number.isFinite);
  const dataMin=Math.min(...values,0), dataMax=Math.max(...values,0);
  const step=Number(options.tickStep)||niceStep(Math.max(dataMax-dataMin,1)/4);
  let min=Math.floor(dataMin/step)*step;
  let max=Math.ceil(dataMax/step)*step;
  if (min===max) max=min+step;
  const ticks=[];
  for(let v=min;v<=max+step*.1;v+=step) ticks.push(Math.abs(v)<step*1e-8?0:v);
  const span=Math.max(max-min,1);
  const x=i=>padLeft+(rounds.length<=1?0:i*(width-padLeft-padRight)/(rounds.length-1));
  const y=v=>height-padBottom-((v-min)/span)*(height-padTop-padBottom);
  const grid=ticks.map(val=>{
    const yy=y(val);
    const zero=Math.abs(val)<step*1e-8;
    const axisFormat=options.axisFormat || valueFormat;
    return `<g><line x1="${padLeft}" y1="${yy}" x2="${width-padRight}" y2="${yy}" class="${zero&&options.zeroLine?'tb-zero-line':'tb-grid-line'}"/><text x="4" y="${yy+4}" class="tb-axis-label">${esc(axisFormat(val))}</text></g>`;
  }).join('');
  const negativeArea = options.negativeArea && min < 0
    ? `<rect x="${padLeft}" y="${y(0)}" width="${width-padLeft-padRight}" height="${Math.max(0,height-padBottom-y(0))}" class="tb-negative-zone"/>`
    : '';
  const paths=series.map((s,idx)=>{
    const color=s.color||PALETTE[idx%PALETTE.length];
    const pts=s.values.map((v,i)=>`${x(i)},${y(Number(v)||0)}`).join(' ');
    const dots=s.values.map((v,i)=>{
      const vv=Number(v)||0;
      return `<circle cx="${x(i)}" cy="${y(vv)}" r="${s.highlight?3.5:3}" fill="${color}"><title>${esc(s.name)} · R${rounds[i]} · ${esc(valueFormat(vv))}</title></circle>`;
    }).join('');
    const labelMode=options.labelMode || (options.pointLabels ? 'all' : 'none');
    const offsets=[-12,-4,14,22];
    const pointLabels=s.values.map((v,i)=>{
      const show=labelMode==='all' || (labelMode==='last' && i===s.values.length-1);
      if(!show) return '';
      const vv=Number(v)||0;
      const offset=labelMode==='last' ? (offsets[idx]??-10) : -10;
      const first=i===0, last=i===s.values.length-1;
      const dx=first?8:last?-8:0;
      const anchor=first?'start':last?'end':'middle';
      return `<text x="${x(i)+dx}" y="${Math.max(13,Math.min(height-padBottom-4,y(vv)+offset))}" text-anchor="${anchor}" class="tb-point-label">${esc(valueFormat(vv))}</text>`;
    }).join('');
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${s.highlight?3:2}" opacity="${s.highlight?1:.82}"/>${dots}${pointLabels}`;
  }).join('');
  const labels=rounds.map((r,i)=>`<text x="${x(i)}" y="${height-7}" text-anchor="middle" class="tb-axis-label">R${r}</text>`).join('');
  const legend=options.hideLegend ? '' : `<div class="tb-chart-legend">${series.map((s,idx)=>`<span><i style="background:${s.color||PALETTE[idx%PALETTE.length]}"></i>${esc(s.name)}</span>`).join('')}</div>`;
  return `<div class="tb-chart ${options.hideLegend?'no-legend':''}"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${negativeArea}${grid}${paths}${labels}</svg>${legend}</div>`;
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
  const userValue=user?.value||0;
  const epsilon=0.0000001;
  const higher=items.filter(item=>item.value>userValue+epsilon).length;
  const tied=items.filter(item=>Math.abs(item.value-userValue)<=epsilon).length;
  const rank=higher+1;
  const avg=1/Math.max(items.length,1);
  const gap=userValue-avg;
  const rankLabel=tied>1?`T${rank}/${items.length}`:`#${rank}/${items.length}`;
  return { items, rank, tied, rankLabel, avg, gap };
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
  if (rank <= Math.max(1, Math.ceil(total * .3))) return 'good';
  if (rank >= Math.max(1, Math.ceil(total * .8))) return 'bad';
  return 'warn';
}

function dashboardKpi(label,value,note='',tone='',noteTone='') {
  return `<div class="tb-kpi"><span>${esc(label)}</span><strong class="${tone}">${value}</strong><small class="${noteTone}">${esc(note)}</small></div>`;
}

function baselineCompatibilityNotice(state) {
  if (state.baselineProfile === 'legacy-active-run-pre-v13') {
    return `<div class="tb-baseline-parity warning"><strong>Legacy active save</strong><span>Save ini dimulai sebelum v1.3 dan masih memakai field lama. Reset/start new session untuk memakai baseline parity 16 perusahaan × 6.25% di R0.</span></div>`;
  }
  return '';
}

function equalShareBaselineNote(state, round) {
  if (round !== 0 || state.companies.length !== 16) return '';
  return `<div class="tb-baseline-parity"><strong>Equal-start baseline</strong><span>Round 0 dimulai dengan 16 perusahaan × 6.25% market share = 100%. Share mulai divergen setelah keputusan Round 1 dijalankan.</span></div>`;
}

function netProfitCompanion(company, rounds) {
  return `<div class="tb-companion-trend"><span class="label">Net profit</span>${rounds.map(r=>{
    const value=Number(snapshotFor(company,r).netProfit||0);
    return `<span class="item"><b>R${r}</b><strong class="${value>=0?'good':'bad'}">${money(value)}</strong></span>`;
  }).join('')}</div>`;
}

function financialDebrief(current, previous, round) {
  if (!previous || round <= 0) return '';
  const revenueChange=Number(current.revenue||0)-Number(previous.revenue||0);
  const profitChange=Number(current.netProfit||0)-Number(previous.netProfit||0);
  const previousCost=Number(previous.revenue||0)-Number(previous.netProfit||0);
  const currentCost=Number(current.revenue||0)-Number(current.netProfit||0);
  const costChange=currentCost-previousCost;
  const revenuePct=previous.revenue ? revenueChange/Math.abs(previous.revenue) : 0;
  const direction=revenueChange<0?'turun':'naik';
  const profitVerb=profitChange<0?'memburuk':'membaik';
  const costPhrase=costChange<0
    ? `implied total cost turun hanya <b>${money(Math.abs(costChange))}</b>`
    : `implied total cost justru naik <b>${money(Math.abs(costChange))}</b>`;
  return `<div class="tb-insight financial"><strong>Financial debrief</strong><span>Revenue R${round} ${direction} <b>${money(Math.abs(revenueChange))} (${Math.abs(revenuePct*100).toFixed(1)}%)</b>, sementara net profit ${profitVerb} <b>${money(Math.abs(profitChange))}</b> menjadi <b class="${current.netProfit>=0?'good':'bad'}">${money(current.netProfit)}</b>. ${costPhrase}; perubahan biaya tersebut jauh lebih kecil daripada pergerakan revenue.</span></div>`;
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
      }],completed,v=>money(v),{pointLabels:true,tickStep:1000000,axisFormat:compactMoneyAxis,hideLegend:true})}${netProfitCompanion(company,completed)}`;

  return page('Management Dashboard','Compact operating and financial overview aligned to the recorded MBS layout.',state,round,`
    ${baselineCompatibilityNotice(state)}
    ${equalShareBaselineNote(state,round)}
    <div class="tb-kpi-strip">
      ${dashboardKpi('Practice NPV',money(user.npv),`Rank #${npvRank}/${state.companies.length}`,'',rankTone(npvRank,state.companies.length))}
      ${dashboardKpi('Net Profit',money(user.netProfit),`Round ${round}`,user.netProfit>=0?'good':'bad')}
      ${dashboardKpi('Market Share',pct(user.marketShare),shareCtx.tied>1?`Equal baseline · ${shareCtx.rankLabel}`:`Rank ${shareCtx.rankLabel}`,'',shareCtx.tied>1?'neutral':rankTone(shareCtx.rank,state.companies.length))}
      ${dashboardKpi('Cash',money(user.cash),user.overdraft>0?`Overdraft ${money(user.overdraft)}`:'No overdraft')}
      ${dashboardKpi('Unit Cost',money(user.unitCost),`Price ${money(user.price)}`,user.unitCost>user.price?'bad':'')}
    </div>
    ${financialDebrief(user,previous,round)}
    <div class="tb-dashboard-grid">
      ${panel('Business Summary',dataTable(['Measure','Value','Δ vs prior'],summaryRows),'tb-span-4')}
      ${panel('Revenue Trend',revenueBlock,'tb-span-8')}
      ${panel('Market Share',`${pieChart(shareCtx.items)}<div class="tb-share-meta"><span>Share position <b>${shareCtx.rankLabel}</b></span><span>Market average <b>${pct(shareCtx.avg)}</b></span><span>vs average <b class="${shareCtx.gap>=0?'good':'bad'}">${shareCtx.gap>=0?'+':''}${(shareCtx.gap*100).toFixed(2)}pp</b></span></div>`,'tb-span-5')}
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
    ['Environment source',e.source === 'official' ? 'Official TopBoss override' : 'Practice engine'],
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
  const pointsData=state.companies.map((company,index)=>{
    const s=snapshotFor(company,round);
    return { index:index+1, company, quality:Number(s.quality||0), image:Number(s.image||0), price:Number(s.price||0) };
  });
  const qualities=pointsData.map(p=>p.quality);
  const images=pointsData.map(p=>p.image);
  const qAvg=qualities.reduce((a,b)=>a+b,0)/Math.max(qualities.length,1);
  const iAvg=images.reduce((a,b)=>a+b,0)/Math.max(images.length,1);
  const qRawMin=Math.min(...qualities), qRawMax=Math.max(...qualities);
  const iRawMin=Math.min(...images), iRawMax=Math.max(...images);
  const qStep=.10;
  const qMin=Math.max(0,Math.floor(qRawMin/qStep)*qStep);
  const qMax=Math.min(1,Math.ceil(qRawMax/qStep)*qStep);
  const iStep=.10;
  const iMin=Math.max(0,Math.floor(iRawMin/.05)*.05);
  const iMax=Math.min(1,iMin+Math.ceil((iRawMax-iMin)/iStep)*iStep);
  const qSpan=Math.max(qMax-qMin,.1), iSpan=Math.max(iMax-iMin,.1);

  const rows=pointsData.map(({index,company,quality,image,price})=>{
    const userClass=company.isUser?'tb-user-row-cell':'';
    return [
      {html:`<span class="tb-point-key ${company.isUser?'user':''}">${index}</span>`,className:`tb-no-cell ${userClass}`},
      {html:esc(company.name),className:`tb-company-name ${userClass}`},
      {html:fixed(quality,3),className:userClass},
      {html:fixed(image,3),className:userClass},
      {html:`${quality-qAvg>=0?'+':''}${fixed(quality-qAvg,3)}`,className:`${quality>=qAvg?'good':'bad'} ${userClass}`},
      {html:`${image-iAvg>=0?'+':''}${fixed(image-iAvg,3)}`,className:`${image>=iAvg?'good':'bad'} ${userClass}`},
      {html:money(price),className:userClass}
    ];
  });

  const width=720,height=390,left=66,right=24,top=34,bottom=50;
  const plotW=width-left-right, plotH=height-top-bottom;
  const mapX=q=>left+((q-qMin)/qSpan)*plotW;
  const mapY=i=>top+(1-((i-iMin)/iSpan))*plotH;
  const xValues=[]; for(let v=qMin;v<=qMax+.0001;v+=qStep) xValues.push(Number(v.toFixed(2)));
  const yValues=[]; for(let v=iMin;v<=iMax+.0001;v+=iStep) yValues.push(Number(v.toFixed(2)));
  const xTicks=xValues.map(value=>{
    const x=mapX(value);
    return `<g><line x1="${x}" y1="${top}" x2="${x}" y2="${height-bottom}" class="tb-scatter-grid"/><text x="${x}" y="${height-23}" text-anchor="middle" class="tb-scatter-tick">${fixed(value,2)}</text></g>`;
  }).join('');
  const yTicks=yValues.map(value=>{
    const y=mapY(value);
    return `<g><line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" class="tb-scatter-grid"/><text x="${left-10}" y="${y+4}" text-anchor="end" class="tb-scatter-tick">${fixed(value,2)}</text></g>`;
  }).join('');
  const avgX=mapX(qAvg), avgY=mapY(iAvg);
  const plotted=pointsData.map(({index,company,quality,image,price})=>{
    const x=mapX(quality),y=mapY(image);
    const color=company.isUser?'#1f5f99':'#aeb9c5';
    return `<g class="${company.isUser?'user-point':'competitor-point'}"><title>#${index} ${esc(company.name)} · Quality ${fixed(quality,3)} · Image ${fixed(image,3)} · Price ${money(price)}</title><circle cx="${x}" cy="${y}" r="${company.isUser?8:7}" fill="${color}" stroke="${company.isUser?'#163f66':'#fff'}" stroke-width="${company.isUser?2:1.5}"/><text x="${x}" y="${y+3}" text-anchor="middle" class="tb-scatter-point-number ${company.isUser?'user':''}">${index}</text>${company.isUser?`<text x="${x+12}" y="${y-12}" class="tb-scatter-user-label">${esc(company.name)}</text>`:''}</g>`;
  }).join('');
  const quadrants=`
    <text x="${left+10}" y="${top+18}" class="tb-quadrant-label">Low quality · High image</text>
    <text x="${width-right-10}" y="${top+18}" text-anchor="end" class="tb-quadrant-label">High quality · High image</text>
    <text x="${left+14}" y="${height-bottom-28}" class="tb-quadrant-label">Low quality · Low image</text>
    <text x="${width-right-22}" y="${height-bottom-28}" text-anchor="end" class="tb-quadrant-label">High quality · Low image</text>`;
  const scatter=`<div class="tb-scatter"><svg viewBox="0 0 ${width} ${height}">${xTicks}${yTicks}<line x1="${avgX}" y1="${top}" x2="${avgX}" y2="${height-bottom}" class="tb-scatter-average"/><line x1="${left}" y1="${avgY}" x2="${width-right}" y2="${avgY}" class="tb-scatter-average"/>${quadrants}<line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" class="tb-scatter-axis-line"/><line x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}" class="tb-scatter-axis-line"/>${plotted}<text x="${left+plotW/2}" y="${height-5}" text-anchor="middle" class="tb-scatter-axis-label">Quality</text><text x="16" y="${top+plotH/2}" text-anchor="middle" class="tb-scatter-axis-label" transform="rotate(-90 16 ${top+plotH/2})">Image</text><text x="${avgX+7}" y="${top+30}" class="tb-scatter-average-label">Market avg quality</text><text x="${width-right-5}" y="${avgY-7}" text-anchor="end" class="tb-scatter-average-label">Market avg image</text></svg><div class="tb-scatter-help">Nomor titik sama dengan kolom No. pada tabel. Hover titik untuk melihat nama dan detail competitor.</div></div>`;
  return page('Product Image','Competitive positioning using market-scaled quality and image axes for the selected round.',state,round,
    `<div class="tb-two-col product-image-layout">${panel('Quality / Image Positioning',scatter,'tb-equal-panel')}${panel('Company Position',dataTable(['No.','Company','Quality','Image','Δ Q avg','Δ I avg','Price'],rows,'company-position-table'),'tb-equal-panel')}</div>`
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
    `${baselineCompatibilityNotice(state)}${equalShareBaselineNote(state,round)}<div class="tb-two-col">${panel('Overall Market Share',`${pieChart(ctx.items)}<div class="tb-share-meta"><span>MARKOWITZ position <b>${ctx.rankLabel}</b></span><span>Market average <b>${pct(ctx.avg)}</b></span><span>vs average <b class="${Math.abs(ctx.gap)<0.0000001?'neutral':ctx.gap>=0?'good':'bad'}">${ctx.gap>=0?'+':''}${(ctx.gap*100).toFixed(2)}pp</b></span></div>`)}${panel('Share Table',dataTable(['Company','Share','Sales','Revenue'],rows))}</div>`
  );
}

export function revenueStatusView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const rounds=availableRounds(state);
  const company=userCompany(state);
  const current=snapshotFor(company,round);
  const ranked=state.companies
    .map(c=>({company:c,s:snapshotFor(c,round)}))
    .sort((a,b)=>(b.s.revenue||0)-(a.s.revenue||0));
  const rows=ranked.map(({company:c,s},idx)=>{
    const userClass=c.isUser?'tb-user-row-cell':'';
    return [
      {html:`#${idx+1}`,className:`${c.isUser?'tb-user-rank':''} ${userClass}`},
      {html:esc(c.name),className:`tb-company-name ${userClass}`},
      {html:money(s.revenue),className:userClass},
      {html:num(s.sales),className:userClass},
      {html:money(s.netProfit),className:`${s.netProfit>=0?'good':'bad'} ${userClass}`}
    ];
  });
  const trend = rounds.length < 2
    ? panel('Revenue / Profit Snapshot',`<div class="tb-single-finance-grid"><div><span>Revenue R${round}</span><strong>${money(current.revenue)}</strong></div><div><span>Net Profit R${round}</span><strong class="${current.netProfit>=0?'good':'bad'}">${money(current.netProfit)}</strong></div></div><div class="callout">Trend line muncul setelah Round 1 menghasilkan titik kedua. R0 sengaja ditampilkan sebagai snapshot agar satu titik tidak terlihat seperti tren.</div>`)
    : `<div class="tb-two-col">${panel('Revenue Trend',lineChart([{name:'Revenue',values:rounds.map(r=>snapshotFor(company,r).revenue||0),highlight:true}],rounds,v=>money(v),{pointLabels:true,tickStep:1000000,axisFormat:compactMoneyAxis,hideLegend:true}))}${panel('Net Profit Trend',lineChart([{name:'Net Profit',values:rounds.map(r=>snapshotFor(company,r).netProfit||0),highlight:true}],rounds,v=>money(v),{pointLabels:true,tickStep:250000,axisFormat:compactMoneyAxis,hideLegend:true,zeroLine:true,negativeArea:true}))}</div>`;
  const previousRound=rounds.filter(r=>r<round).at(-1);
  const previous=Number.isFinite(previousRound)?snapshotFor(company,previousRound):null;
  return page('Revenue / Sales Status','Revenue, sales volume, and profitability by company and across rounds.',state,round,
    `${financialDebrief(current,previous,round)}${trend}${panel('Company Revenue Status',dataTable(['Rank','Company','Revenue','Sales','Net Profit'],rows,'revenue-status-table'))}`
  );
}

export function salesTrendView(state, requestedRound) {
  const round=selectedRound(state,requestedRound);
  const rounds=availableRounds(state);
  const c=userCompany(state);
  const current=snapshotFor(c,round);
  const previousRound=rounds.filter(r=>r<round).at(-1);
  const previous=Number.isFinite(previousRound)?snapshotFor(c,previousRound):null;
  const rows=rounds.map(r=>{
    const s=snapshotFor(c,r);
    return [{text:'R'+r},{html:num(s.potentialDemand)},{html:num(s.sales)},{html:num(s.production)},{html:pct(s.marketShare)}];
  });
  const visual = rounds.length < 2
    ? panel('R0 Operating Snapshot',`${barChart([
        {label:'Potential demand',value:current.potentialDemand||0},
        {label:'Sales',value:current.sales||0},
        {label:'Production',value:current.production||0}
      ],v=>num(v))}<div class="callout">Trend line muncul mulai Round 1. Pada R0, simulator menampilkan grouped snapshot karena baru ada satu periode.</div>`)
    : panel('Demand / Sales / Production',lineChart([
        {name:'Potential demand',values:rounds.map(r=>snapshotFor(c,r).potentialDemand||0)},
        {name:'Sales',values:rounds.map(r=>snapshotFor(c,r).sales||0),highlight:true},
        {name:'Production',values:rounds.map(r=>snapshotFor(c,r).production||0)}
      ],rounds,v=>num(v),{labelMode:'last',tickStep:250000,axisFormat:compactNumberAxis}));
  const demand=Number(current.potentialDemand||0), sales=Number(current.sales||0), production=Number(current.production||0);
  const lost=Math.max(0,demand-sales), lostPct=demand>0?lost/demand:0;
  const carryUsed=Math.max(0,sales-production);
  const carryAvailable=Number(previous?.finishedGoods||0);
  const insight = round>0 && lost>0
    ? `<div class="tb-insight"><strong>Automatic debrief</strong><span>Demand gap R${round}: <b>${num(lost)} units (${pct(lostPct)})</b> tidak menjadi sales; supply hanya menutup <b>${pct(demand>0?sales/demand:0)}</b> dari demand. ${carryUsed>0?`Sales melebihi current production sebesar <b>${num(carryUsed)} units</b>${carryAvailable>0?`, konsisten dengan pemakaian carry-in finished goods R${previousRound} (${num(carryAvailable)} units)`:''}.`:''}</span></div>`
    : '';
  return page('Sales Trend','Demand, sales, production, and share movement across completed rounds.',state,round,
    `${visual}${insight}${panel('Round Data',dataTable(['Round','Demand','Sales','Production','Share'],rows))}`
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
  marketShare:{label:'Market Share',format:pct,kind:'share'},
  revenue:{label:'Revenue',format:money,kind:'money-zero'},
  sales:{label:'Sales',format:num,kind:'number-zero'},
  price:{label:'Price',format:money,kind:'price'},
  quality:{label:'Quality',format:v=>fixed(v,3),kind:'bounded'},
  image:{label:'Image',format:v=>fixed(v,3),kind:'bounded'},
  netProfit:{label:'Net Profit',format:money,kind:'money-zero'},
  unitCost:{label:'Unit Cost',format:money,kind:'price'},
  npv:{label:'Practice NPV',format:money,kind:'money-zero'}
};

function competitiveAxis(metricKey, values) {
  const clean=values.map(Number).filter(Number.isFinite);
  const minValue=Math.min(...clean,0);
  const maxValue=Math.max(...clean,0);

  if (metricKey === 'marketShare') {
    const top=Math.max(.12, Math.ceil((maxValue*100)/4)*.04);
    return { min:0, max:top, step:.04, format:v=>`${Math.round(v*100)}%` };
  }
  if (metricKey === 'price' || metricKey === 'unitCost') {
    const actualMin=Math.min(...clean), actualMax=Math.max(...clean);
    const min=Math.floor((actualMin-.25)*2)/2;
    const max=Math.ceil((actualMax+.25)*2)/2;
    return { min, max:Math.max(max,min+.5), step:.5, format:v=>`$${Number(v).toFixed(2)}` };
  }
  if (metricKey === 'quality' || metricKey === 'image') {
    const actualMin=Math.min(...clean), actualMax=Math.max(...clean);
    const min=Math.max(0,Math.floor((actualMin-.05)*10)/10);
    const max=Math.min(1,Math.ceil((actualMax+.05)*10)/10);
    return { min, max:Math.max(max,min+.1), step:.1, format:v=>Number(v).toFixed(2) };
  }

  const rawMin=metricKey==='netProfit' ? Math.min(minValue,0) : 0;
  const rawMax=Math.max(maxValue,1);
  const step=niceStep(Math.max(rawMax-rawMin,1)/4);
  const min=Math.floor(rawMin/step)*step;
  const max=Math.ceil(rawMax/step)*step || step;
  const format=(metricKey==='revenue'||metricKey==='netProfit'||metricKey==='npv')
    ? compactMoneyAxis
    : compactNumberAxis;
  return { min, max, step, format };
}

function competitiveRankingChart(items, metric, metricKey, round) {
  const sorted=[...items].sort((a,b)=>b.value-a.value);
  const max=Math.max(...sorted.map(x=>Math.abs(x.value)),1);
  return `<div class="competitive-ranking" data-competitive-chart>
    ${sorted.map((item,idx)=>{
      const width=Math.max(2,Math.abs(item.value)/max*100);
      const rank=idx+1;
      return `<div class="competitive-rank-row ${item.isUser?'is-user':''}" data-company-key="${esc(item.key)}">
        <span class="competitive-rank">#${rank}</span>
        <span class="competitive-name">${esc(item.name)}</span>
        <div class="competitive-bar-track"><div class="competitive-bar ${item.isUser?'is-user':''}" style="width:${width}%"></div></div>
        <strong>${metric.format(item.value)}</strong>
      </div>`;
    }).join('')}
    <div class="tb-note">R${round}: ranking snapshot dipakai karena baru sedikit ronde. Trend line baru digunakan setelah minimal empat ronde tersedia.</div>
  </div>`;
}

function competitiveLineChart(series, rounds, metric, metricKey) {
  const width=760, height=270, left=74, right=42, top=24, bottom=38;
  const values=series.flatMap(s=>s.values).map(Number).filter(Number.isFinite);
  const axis=competitiveAxis(metricKey,values);
  const span=Math.max(axis.max-axis.min,1e-9);
  const x=i=>left+(rounds.length<=1?0:i*(width-left-right)/(rounds.length-1));
  const y=v=>height-bottom-((v-axis.min)/span)*(height-top-bottom);
  const ticks=[];
  for(let v=axis.min;v<=axis.max+axis.step*.1;v+=axis.step) ticks.push(Number(v.toFixed(10)));
  const grid=ticks.map(v=>`<g><line x1="${left}" y1="${y(v)}" x2="${width-right}" y2="${y(v)}" class="tb-grid-line"/><text x="${left-10}" y="${y(v)+4}" text-anchor="end" class="competitive-axis-label">${esc(axis.format(v))}</text></g>`).join('');

  const rankedLast=[...series].sort((a,b)=>(b.values.at(-1)||0)-(a.values.at(-1)||0));
  const labelNames=new Set([series.find(s=>s.highlight)?.name,...rankedLast.slice(0,3).map(s=>s.name)].filter(Boolean));

  const paths=series.map((s,idx)=>{
    const color=s.highlight?'#1f5f99':'#aeb8c2';
    const pts=s.values.map((v,i)=>`${x(i)},${y(Number(v)||0)}`).join(' ');
    const last=s.values.length-1;
    const lastValue=Number(s.values[last]||0);
    return `<g class="competitive-series ${s.highlight?'is-user':''}" data-company-key="${esc(s.key)}">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${s.highlight?3.2:1.3}" opacity="${s.highlight?1:.52}"/>
      ${s.values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(Number(v)||0)}" r="${s.highlight?4:2.5}" fill="${color}"><title>${esc(s.name)} · R${rounds[i]} · ${esc(metric.format(Number(v)||0))}</title></circle>`).join('')}
      ${labelNames.has(s.name)?`<text x="${x(last)-4}" y="${Math.max(14,y(lastValue)-8-(idx%3)*3)}" text-anchor="end" class="competitive-end-label ${s.highlight?'is-user':''}">${esc(s.name)} ${esc(metric.format(lastValue))}</text>`:''}
    </g>`;
  }).join('');

  const labels=rounds.map((r,i)=>`<text x="${x(i)}" y="${height-10}" text-anchor="middle" class="competitive-axis-label">R${r}</text>`).join('');
  const legend=`<div class="competitive-legend">${series.map(s=>`<button type="button" class="${s.highlight?'is-user':''}" data-competitor-toggle data-company-key="${esc(s.key)}"><i></i>${esc(s.name)}</button>`).join('')}</div>`;
  return `<div class="tb-chart competitive-chart" data-competitive-chart><svg viewBox="0 0 ${width} ${height}">${grid}${paths}${labels}</svg>${legend}</div>`;
}

function competitiveDelta(metricKey, current, baseline, metric) {
  const diff=current-baseline;
  if (Math.abs(diff) < 1e-10) return '—';
  if (metricKey==='marketShare') return `${diff>=0?'▲':'▼'} ${Math.abs(diff*100).toFixed(2)}pp`;
  if (metricKey==='price'||metricKey==='unitCost'||metricKey==='revenue'||metricKey==='netProfit'||metricKey==='npv') {
    return `${diff>=0?'▲':'▼'} ${metric.format(Math.abs(diff))}`;
  }
  if (metricKey==='quality'||metricKey==='image') return `${diff>=0?'▲':'▼'} ${Math.abs(diff).toFixed(3)}`;
  return `${diff>=0?'▲':'▼'} ${num(Math.abs(diff))}`;
}

export function competitiveAnalysisView(state, requestedRound, metricKey='marketShare') {
  const round=selectedRound(state,requestedRound);
  const rounds=availableRounds(state);
  const metric=METRICS[metricKey]||METRICS.marketShare;
  const baselineRound=rounds[0] ?? 0;

  const items=state.companies.map((company,index)=>{
    const current=Number(snapshotFor(company,round)[metricKey]||0);
    const baseline=Number(snapshotFor(company,baselineRound)[metricKey]||0);
    return {
      key:`c${index}`,
      company,
      name:company.name,
      isUser:Boolean(company.isUser),
      value:current,
      baseline,
      delta:current-baseline,
      values:rounds.map(r=>Number(snapshotFor(company,r)[metricKey]||0))
    };
  });

  const ranked=[...items].sort((a,b)=>b.value-a.value);
  const user=ranked.find(x=>x.isUser);
  const userRank=Math.max(1,ranked.findIndex(x=>x.isUser)+1);
  const leader=ranked[0];
  const gap=(leader?.value||0)-(user?.value||0);
  const gapText=metricKey==='marketShare'
    ? `${(gap*100).toFixed(2)} poin`
    : metric.format(gap);

  const insight=user && leader
    ? `R${round}: MARKOWITZ berada di peringkat #${userRank} dari ${ranked.length} untuk ${metric.label}, dengan ${metric.format(user.value)}. Pemimpin: ${leader.name} ${metric.format(leader.value)}; gap ${gapText}.`
    : 'Belum ada data kompetitif yang cukup untuk debrief.';

  const chips=Object.entries(METRICS).map(([key,item])=>`<button type="button" class="competitive-chip ${key===metricKey?'active':''}" data-competitive-metric="${key}">${esc(item.label)}</button>`).join('');

  const visual=rounds.length<4
    ? competitiveRankingChart(items,metric,metricKey,round)
    : competitiveLineChart(items.map(x=>({key:x.key,name:x.name,values:x.values,highlight:x.isUser})),rounds,metric,metricKey);

  const tableRows=ranked.map((item,idx)=>{
    const delta=competitiveDelta(metricKey,item.value,item.baseline,metric);
    const deltaClass=item.delta>0?'good':item.delta<0?'bad':'neutral';
    const cls=item.isUser?'competitive-user-row':'';
    return [
      {html:`#${idx+1}`,className:cls},
      {html:`<span data-company-key="${esc(item.key)}">${esc(item.name)}</span>`,className:`competitive-company-cell ${cls}`},
      ...rounds.map(r=>({html:metric.format(Number(snapshotFor(item.company,r)[metricKey]||0)),className:cls})),
      {html:delta,className:`${deltaClass} ${cls}`}
    ];
  });

  const baselineNote=metricKey==='marketShare' && baselineRound===0
    ? `<div class="tb-note">R0 adalah equal-share baseline: ${state.companies.length} perusahaan × ${(100/state.companies.length).toFixed(2)}% = 100%.</div>`
    : '';

  return page('Competitive Analysis','Rank competitors first, then use multi-round trends when enough history is available.',state,round,
    `<div class="competitive-chip-row">${chips}</div>
     <div class="competitive-insight"><strong>AUTOMATIC DEBRIEF</strong><span>${esc(insight)}</span></div>
     ${panel(metric.label+' by Company',visual)}
     ${baselineNote}
     ${panel('Competitor Table',dataTable(['Rank','Company',...rounds.map(r=>'R'+r),'Δ vs R'+baselineRound],tableRows,'competitive-table'))}`
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
     <div class="tb-note">${result.isOfficial
       ? 'Official TopBoss financial statement imported through Official Sync.'
       : (state.official?.actuals?.[String(round)]
         ? 'Official headline actuals exist for this round, but no detailed official statement has been saved yet.'
         : (result.isDerived?'Derived legacy detail: reconstructed transparently because this saved round predates line-item storage.':'Stored simulated financial detail.'))}</div>`
  );
}
