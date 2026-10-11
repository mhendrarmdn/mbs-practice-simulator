import { deepClone, esc, money, num, pct } from './utils.js';
import { simulateRound, normalizeDecision } from './simulator.js';
import { userCompany } from './state.js';
import { adaptiveCalibrationProfile } from './calibrationEngine.js';

export const WAR_SCENARIOS = [
  ['baseline','Base'],['demandBoom','Demand Boom'],['slowdown','Slowdown'],
  ['rawShock','Raw Material Shock'],['equipmentDisruption','Capacity Disruption']
];
export const WAR_FIELDS = [
  ['price','Price'],['marketing','Marketing'],['rd','R&D'],['production','Production'],
  ['materialPurchase','Material Purchase'],['equipment','Equipment'],
  ['maintenance','Maintenance'],['dividend','Dividend']
];
const definitions = [
  ['margin','A — Margin Recovery', {price:1.05,marketing:.90,rd:.90,production:.95,materialPurchase:.90,equipment:0,dividend:0}],
  ['share','B — Share Capture',{price:.97,marketing:1.25,rd:1.15,production:1.15,materialPurchase:1.15,equipment:1.1,dividend:0}],
  ['balanced','C — Balanced',{}],
  ['defensive','D — Defensive',{marketing:.8,rd:.8,production:.9,materialPurchase:.85,equipment:0,dividend:0}],
  ['custom','E — Custom',{}]
];
export function warRoomFor(state) {
  const current=state.warRoom;
  if (current?.round===state.currentRound && Array.isArray(current.candidates) && current.candidates.length) return current;
  const starting=normalizeDecision(state.draft);
  return {round:state.currentRound,final:null,candidates:definitions.map(([id,name,factors])=>({
    id,name,decision:normalizeDecision(Object.fromEntries(WAR_FIELDS.map(([k])=>[k,
      k==='price' ? Math.round(starting[k]*(factors[k]??1)*100)/100 :
      Math.round((factors[k]===0?0:starting[k]*(factors[k]??1))/1000)*1000
    ]))),votes:[],comments:[]
  }))};
}
function scenarioState(state,decision,preset) {
  const clone=deepClone(state);
  clone.mode='sandbox';
  clone.scenarioPreset=preset;
  clone.surpriseMode=false;
  clone.roomCode='';
  clone.roomKey='';
  clone.roomMembers=[];
  clone.decisionLocked=false;
  clone.roundDeadlineAt=null;
  clone.draft=deepClone(decision);
  return clone;
}
export function evaluateWarRoom(state) {
  const room=warRoomFor(state);
  if(state.currentRound>=state.maxRounds) return {room,rows:[],message:'All result rounds completed.'};
  const starting=userCompany(state);
  const calibration=adaptiveCalibrationProfile(state);
  const rows=room.candidates.map(candidate=>{
    const outcomes=[],errors=[];
    for(const [key,label] of WAR_SCENARIOS) {
      try {
        const test=scenarioState(state,candidate.decision,key);
        simulateRound(test);
        const c=userCompany(test);
        if(!Number.isFinite(Number(c.npv))) throw Error('Invalid NPV');
        outcomes.push({key,label,revenue:c.revenue,netProfit:c.netProfit,marketShare:c.marketShare,sales:c.sales,
          cash:c.cash,overdraft:c.overdraft,unitCost:c.unitCost,npv:c.npv,production:c.production,
          capacity:c.capacity,rawMaterial:c.rawMaterial,finishedGoods:c.finishedGoods,
          quality:c.quality,image:c.image,potentialDemand:c.potentialDemand});
      } catch(e){errors.push(label+': '+String(e?.message||e));}
    }
    const base=outcomes.find(x=>x.key==='baseline');
    const worst=outcomes.length? [...outcomes].sort((a,b)=>a.npv-b.npv)[0]:null;
    const average=outcomes.length?outcomes.reduce((sum,x)=>sum+x.npv,0)/outcomes.length:NaN;
    const robust=Number.isFinite(average)&&worst? 0.45*average+0.55*worst.npv:NaN;
    const supplyRisk=base?Math.max(0,Number(base.potentialDemand||0)-Number(base.sales||0)):null;
    return {candidate,base,worst,robust,average,outcomes,errors,
      npvDelta:base?base.npv-Number(starting.npv||0):null,supplyRisk,confidence:calibration.confidence};
  });
  return {room,rows,calibration,message:''};
}
const moneySafe=v=>Number.isFinite(Number(v))?money(v):'—';
const numberSafe=v=>Number.isFinite(Number(v))?num(Math.round(v)):'—';
const percentageSafe=v=>Number.isFinite(Number(v))?pct(v):'—';
export function warRoomView(state){
  const {room,rows,calibration,message}=evaluateWarRoom(state);
  const editable=!room.final && state.currentRound<state.maxRounds;
  const final=room.final;
  const data=rows.map(({candidate,base,worst,robust,errors,supplyRisk})=>`<tr>
    <th>${esc(candidate.name)}<small style="display:block;font-weight:normal">${candidate.votes.length} vote(s)</small></th>
    <td>${moneySafe(base?.revenue)}</td><td>${moneySafe(base?.netProfit)}</td>
    <td>${percentageSafe(base?.marketShare)}</td><td>${numberSafe(base?.sales)}</td>
    <td>${moneySafe(base?.cash)}</td><td>${moneySafe(base?.overdraft)}</td>
    <td>${moneySafe(base?.unitCost)}</td><td>${moneySafe(base?.npv)}</td>
    <td>${moneySafe(worst?.npv)}</td><td>${moneySafe(robust)}</td>
    <td>${numberSafe(supplyRisk)}</td>
    <td>${errors.length?'Partial ('+errors.length+' failed)':'5/5'}</td>
    <td><button class="secondary" data-action="war-vote" data-war-id="${candidate.id}" ${!editable?'disabled':''}>Vote</button>
    <button class="secondary" data-action="war-final" data-war-id="${candidate.id}" ${!editable?'disabled':''}>Captain Lock</button></td>
  </tr>`).join('');
  return `<div class="page-head"><div><div class="eyebrow">COMPETITION DECISION COCKPIT · v1.9.0</div>
    <h1>Decision War Room</h1><p class="subtitle">Compare five named candidates against the SAME starting state, official environment, and adaptive calibration. Practice estimates, never TopBoss guarantees.</p></div></div>
    <div class="callout">Round ${state.currentRound+1} · ${calibration?.samples||0} official calibration pairs · confidence ${calibration?.confidence||0}% · scenario-aware comparison. ${esc(message||'')}</div>
    <div class="card"><div class="card-head"><div><span>FAIR SIDE-BY-SIDE COMPARISON</span><h2>Candidate Scoreboard</h2></div></div>
    <div style="overflow-x:auto"><table class="data-table war-table"><thead><tr><th>Candidate</th><th>Revenue</th><th>Net Profit</th><th>Share</th><th>Sales</th><th>Cash</th><th>Overdraft</th><th>Unit Cost</th><th>NPV Proxy</th><th>Worst NPV</th><th>Robust Score</th><th>Demand Gap</th><th>Scenarios</th><th>Team</th></tr></thead><tbody>${data||'<tr><td colspan="14">No active round</td></tr>'}</tbody></table></div>
    <small>Robust score = 45% mean scenario NPV + 55% worst scenario NPV (practice comparison heuristic). Incomplete scenarios are flagged; treat ranking as provisional.</small></div>
    ${room.candidates.map(candidate=>`<div class="card war-candidate"><div class="card-head"><div><span>CANDIDATE · ${esc(candidate.id.toUpperCase())}</span><h2>${esc(candidate.name)}</h2></div></div>
    <div class="war-field-grid">${WAR_FIELDS.map(([key,label])=>`<label>${label}<input type="number" step="${key==='price'?'0.01':'1'}" min="0" data-war-field="${key}" data-war-id="${candidate.id}" value="${Number(candidate.decision[key]||0)}" ${!editable?'disabled':''}></label>`).join('')}</div>
    <div class="actions"><button class="secondary" data-action="war-vote" data-war-id="${candidate.id}" ${!editable?'disabled':''}>+ Vote</button>
    <button class="secondary" data-action="war-comment" data-war-id="${candidate.id}" ${!editable?'disabled':''}>+ Rationale</button>
    <button class="primary" data-action="war-final" data-war-id="${candidate.id}" ${!editable?'disabled':''}>Captain: Final Lock</button></div>
    <div class="war-feedback">${candidate.comments.slice(-4).map(c=>`<p><strong>${esc(c.by)}:</strong> ${esc(c.text)}</p>`).join('')||'<small>No rationale yet.</small>'}</div></div>`).join('')}
    ${final?`<div class="card war-final"><div class="card-head"><div><span>CAPTAIN-LOCKED · ${esc(final.lockedAt)}</span><h2>FINAL TOPBOSS INPUT — ${esc(final.name)}</h2></div></div>
    <div class="war-input-grid">${WAR_FIELDS.map(([key,label])=>`<div><span>${label}</span><strong>${key==='price'?Number(final.decision[key]).toFixed(2):numberSafe(final.decision[key])}</strong></div>`).join('')}</div>
    <div class="callout warn">Manually enter these eight values into official TopBoss. Verify each field independently; locking here does NOT submit to TopBoss.</div>
    <div class="actions"><button class="secondary" data-action="war-apply-final">Captain: Copy to Business Decisions</button>
    <button class="secondary" data-action="war-unlock">Captain: Unlock (reason required)</button></div></div>`:''}
  `;
}
