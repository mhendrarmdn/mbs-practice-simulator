import { OBSERVED_ANCHORS, TRAINING_PROXY_NOTES } from './config.js';
import { getSupabaseConfig, isCaptain } from './supabase.js';
import { previewSensitivity } from './sensitivity.js';
import { esc, fixed, money, num, pct } from './utils.js';

function navButton(id, label, active) {
  return `<button data-tab="${id}" class="${active === id ? 'active' : ''}">${label}</button>`;
}

export function shell(state, activeTab, themePreference) {
  const timer = Math.max(0, Number(state.timerRemaining || 0));
  const mm = String(Math.floor(timer / 60)).padStart(2, '0');
  const ss = String(timer % 60).padStart(2, '0');
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="logo">MBS <span>ARENA</span></div>
        <div class="sublogo">Practice Simulator v0.2</div>
        <nav class="nav">
          ${navButton('dashboard', 'Dashboard', activeTab)}
          ${navButton('decisions', 'Business Decisions', activeTab)}
          ${navButton('status', 'Status', activeTab)}
          ${navButton('analysis', 'Analysis', activeTab)}
          ${navButton('financials', 'Financial Statements', activeTab)}
          ${navButton('history', 'Decision History', activeTab)}
          ${navButton('leaderboard', 'Leaderboard', activeTab)}
          ${navButton('scenarios', 'Scenario Center', activeTab)}
          ${navButton('model', 'Model Transparency', activeTab)}
          ${navButton('setup', 'Room & Setup', activeTab)}
        </nav>
        <div class="sidebar-bottom">
          <strong>TRAINING MODEL</strong><br>
          Independent practice engine; proprietary TopBoss formulas remain unknown.
        </div>
      </aside>
      <section class="main">
        <header class="topbar">
          <div>
            <div class="team-title">${esc(state.teamName)}</div>
            <div class="small">ROUND ${state.currentRound} / ${state.maxRounds}</div>
          </div>
          <div class="topmeta">
            <select id="modeSelect" class="compact-select" aria-label="Simulation mode">
              <option value="training" ${state.mode === 'training' ? 'selected' : ''}>Training</option>
              <option value="competition" ${state.mode === 'competition' ? 'selected' : ''}>Competition</option>
              <option value="sandbox" ${state.mode === 'sandbox' ? 'selected' : ''}>Sandbox</option>
            </select>
            <span class="badge timer-badge ${state.mode === 'competition' && timer <= 120 ? 'danger-badge' : ''}">
              ${state.mode === 'competition' ? `⏱ ${mm}:${ss}` : 'NO TIMER'}
            </span>
            <span class="badge" id="syncBadge">${state.roomCode ? '● Online room' : '● Saved'}</span>
            <select id="themeSelect" class="compact-select" aria-label="Theme">
              <option value="system" ${themePreference === 'system' ? 'selected' : ''}>◐ System</option>
              <option value="light" ${themePreference === 'light' ? 'selected' : ''}>☀ Light</option>
              <option value="dark" ${themePreference === 'dark' ? 'selected' : ''}>☾ Dark</option>
            </select>
          </div>
        </header>
        <div class="content" id="content"></div>
      </section>
    </div>`;
}

function metric(label, value, note, tone = '') {
  return `<div class="card metric"><div class="label">${label}</div><div class="value ${tone}">${value}</div><div class="delta">${note}</div></div>`;
}

function diagnosticText(user) {
  const notes = [];
  if (user.unitCost > user.price) notes.push('<div class="alert bad-bg"><strong>Unit cost > price</strong><span>Penjualan tambahan berisiko memperdalam rugi.</span></div>');
  if (user.overdraft > 0) notes.push(`<div class="alert bad-bg"><strong>Overdraft aktif</strong><span>Likuiditas membutuhkan pembiayaan ${money(user.overdraft)}.</span></div>`);
  if (user.potentialDemand > user.sales * 1.15 && user.finishedGoods < user.sales * 0.05) notes.push('<div class="alert warn-bg"><strong>Supply constraint</strong><span>Demand potensial jauh di atas actual sales dan FG hampir habis.</span></div>');
  if (user.rawMaterial > user.production * 3) notes.push('<div class="alert warn-bg"><strong>RM inventory tinggi</strong><span>Working capital berpotensi tertahan di bahan baku.</span></div>');
  if (!notes.length) notes.push('<div class="alert good-bg"><strong>Financial health stabil</strong><span>Belum ada red flag ekstrem dari indikator utama.</span></div>');
  return notes.join('');
}

export function dashboardView(state) {
  const user = state.companies.find(company => company.isUser);
  const sorted = [...state.companies].sort((a, b) => b.npv - a.npv);
  const rank = sorted.findIndex(c => c.isUser) + 1;
  const revenueMax = Math.max(...user.history.map(item => item.revenue), 1);
  const latestEvent = state.eventHistory?.at(-1);
  return `
    <div class="page-head"><div><div class="eyebrow">EXECUTIVE COCKPIT</div><h1>Dashboard</h1><div class="subtitle">Decision → operation → financial impact, dalam satu ronde yang konsisten.</div></div>
      <div class="actions"><button class="secondary" data-action="export-save">Export Save</button><button class="primary" data-action="goto-decisions" ${state.currentRound >= state.maxRounds ? 'disabled' : ''}>Next Decision</button></div>
    </div>
    ${latestEvent ? `<div class="event"><strong>${esc(latestEvent.title)}</strong> · Round ${latestEvent.round} — ${esc(latestEvent.text)}</div>` : ''}
    <div class="grid">
      ${metric('Practice NPV', money(user.npv), `Rank #${rank} of ${sorted.length}`)}
      ${metric('Net Profit', money(user.netProfit), 'Current round', user.netProfit >= 0 ? 'good' : 'bad')}
      ${metric('Market Share', pct(user.marketShare), `Demand ${num(user.potentialDemand)}`)}
      ${metric('Unit Cost', money(user.unitCost), `Price ${money(user.price)}`, user.unitCost > user.price ? 'bad' : 'good')}
      ${metric('Cash', money(user.cash), user.overdraft ? `Overdraft ${money(user.overdraft)}` : 'No overdraft')}
      ${metric('Balanced Score', fixed(user.balancedScore, 1), 'Practice proxy / 100')}
      <div class="card span8">
        <div class="section-title">Revenue & Profit Trend</div>
        ${user.history.map(item => `<div class="trend-row"><span>R${item.round}</span><div class="bar"><div style="width:${Math.max(4, item.revenue / revenueMax * 100)}%"></div></div><strong>${money(item.revenue)}</strong><em class="${item.netProfit >= 0 ? 'good' : 'bad'}">${money(item.netProfit)}</em></div>`).join('')}
      </div>
      <div class="card span4"><div class="section-title">Management Alerts</div>${diagnosticText(user)}</div>
    </div>`;
}

function field(label, key, value, step, unit, disabled) {
  return `<div class="field"><label><span>${label}</span><span>${unit}</span></label><input type="number" data-decision="${key}" value="${Number(value).toFixed(key === 'price' ? 2 : 0)}" min="0" step="${step}" ${disabled ? 'disabled' : ''}></div>`;
}

export function decisionsView(state) {
  const user = state.companies.find(company => company.isUser);
  const d = state.draft;
  const complete = state.currentRound >= state.maxRounds;
  const captain = isCaptain() || !state.roomCode;
  const locked = Boolean(state.decisionLocked);
  const s = previewSensitivity(state, state.sensitivity?.key || 'price', state.sensitivity?.deltaPct ?? 10);
  return `
    <div class="page-head"><div><div class="eyebrow">ROUND ${Math.min(state.currentRound + 1, state.maxRounds)}</div><h1>Business Decisions</h1><div class="subtitle">Delapan management inputs utama. Competition Mode mengunci input saat timer habis.</div></div>
    <button class="secondary" data-action="toggle-lock">${locked ? 'Unlock Draft' : 'Lock Draft'}</button></div>
    ${locked ? `<div class="event"><strong>Draft locked.</strong> ${esc(state.lockReason || 'Manual lock')}</div>` : ''}
    <div class="grid">
      <div class="card span8">
        <div class="section-title">Decision Form</div>
        <div class="input-grid">
          ${field('Price', 'price', d.price, '0.10', '$ / unit', locked)}
          ${field('Marketing', 'marketing', d.marketing, '10000', '$', locked)}
          ${field('R&D', 'rd', d.rd, '10000', '$', locked)}
          ${field('Production Request', 'production', d.production, '1000', 'units', locked)}
          ${field('Material Purchase', 'materialPurchase', d.materialPurchase, '10000', 'material units', locked)}
          ${field('Equipment Investment', 'equipment', d.equipment, '50000', '$', locked)}
          ${field('Maintenance', 'maintenance', d.maintenance, '10000', '$', locked)}
          ${field('Dividend', 'dividend', d.dividend, '10000', '$', locked)}
        </div>
        <div class="actions">
          <button class="primary" data-action="submit-round" ${complete || !captain || locked ? 'disabled' : ''}>${complete ? 'GAME COMPLETE' : captain ? 'LOCK & SUBMIT ROUND' : 'CAPTAIN SUBMITS ROUND'}</button>
          <button class="secondary" data-action="load-r1">Load R1 Reference</button>
        </div>
      </div>
      <div class="card span4">
        <div class="section-title">Sensitivity Lab</div>
        <div class="sensitivity-controls">
          <select id="sensitivityKey">
            <option value="price" ${state.sensitivity?.key === 'price' ? 'selected' : ''}>Price</option>
            <option value="marketing" ${state.sensitivity?.key === 'marketing' ? 'selected' : ''}>Marketing</option>
            <option value="rd" ${state.sensitivity?.key === 'rd' ? 'selected' : ''}>R&D</option>
            <option value="production" ${state.sensitivity?.key === 'production' ? 'selected' : ''}>Production</option>
          </select>
          <input id="sensitivityPct" type="number" value="${state.sensitivity?.deltaPct ?? 10}" step="1"><span>% change</span>
        </div>
        <div class="sensitivity-results">
          <div><span>Demand</span><strong class="${s.demandEffect >= 0 ? 'good' : 'bad'}">${s.demandEffect >= 0 ? '+' : ''}${fixed(s.demandEffect,1)}%</strong></div>
          <div><span>Revenue</span><strong class="${s.revenueEffect >= 0 ? 'good' : 'bad'}">${s.revenueEffect >= 0 ? '+' : ''}${fixed(s.revenueEffect,1)}%</strong></div>
          <div><span>Profit</span><strong class="${s.profitEffect >= 0 ? 'good' : 'bad'}">${s.profitEffect >= 0 ? '+' : ''}${fixed(s.profitEffect,1)}%</strong></div>
        </div>
        <div class="callout">Directional training estimate, bukan forecast resmi TopBoss.</div>
        <hr>
        <div class="section-title">Operating Position</div>
        <table><tr><td>Potential Demand</td><td>${num(user.potentialDemand)}</td></tr><tr><td>Sales</td><td>${num(user.sales)}</td></tr><tr><td>FG Inventory</td><td>${num(user.finishedGoods)}</td></tr><tr><td>Capacity</td><td>${num(user.capacity)}</td></tr><tr><td>RM Inventory</td><td>${num(user.rawMaterial)}</td></tr><tr><td>Cash</td><td>${money(user.cash)}</td></tr></table>
      </div>
    </div>`;
}

function competitionTable(state) {
  const sorted = [...state.companies].sort((a, b) => b.marketShare - a.marketShare);
  return `<div class="table-wrap"><table><thead><tr><th>Company</th><th>Strategy</th><th>Quality</th><th>Image</th><th>Price</th><th>Sales</th><th>Share</th></tr></thead><tbody>${sorted.map(company => `<tr class="${company.isUser ? 'user-row' : ''}"><td>${esc(company.name)}</td><td>${esc(company.strategy)}</td><td>${fixed(company.quality,2)}</td><td>${fixed(company.image,2)}</td><td>${money(company.price)}</td><td>${num(company.sales)}</td><td>${pct(company.marketShare)}</td></tr>`).join('')}</tbody></table></div>`;
}

export function statusView(state) {
  const user = state.companies.find(company => company.isUser);
  const economy = state.economy;
  return `<h1>Status</h1><div class="subtitle">Market and operational consequences of the latest submitted decisions.</div><div class="grid">
    <div class="card span4"><div class="section-title">Economy</div><table><tr><td>Price Index</td><td>${economy ? fixed(economy.priceIndex,2) : '100.00'}</td></tr><tr><td>Growth Indicator</td><td>${economy ? fixed(economy.growth*100,2) : '100.00'}</td></tr><tr><td>Seasonal Indicator</td><td>${economy ? fixed(economy.seasonal*100,2) : '100.00'}</td></tr></table></div>
    <div class="card span4"><div class="section-title">Product</div><table><tr><td>Quality</td><td>${fixed(user.quality,3)}</td></tr><tr><td>Image</td><td>${fixed(user.image,3)}</td></tr><tr><td>Price</td><td>${money(user.price)}</td></tr></table></div>
    <div class="card span4"><div class="section-title">Business Status</div><table><tr><td>Potential Demand</td><td>${num(user.potentialDemand)}</td></tr><tr><td>Sales</td><td>${num(user.sales)}</td></tr><tr><td>Share</td><td>${pct(user.marketShare)}</td></tr><tr><td>FG</td><td>${num(user.finishedGoods)}</td></tr><tr><td>Capacity</td><td>${num(user.capacity)}</td></tr><tr><td>RM</td><td>${num(user.rawMaterial)}</td></tr></table></div>
    <div class="card span12"><div class="section-title">Sales Status — Competitive Market</div>${competitionTable(state)}</div></div>`;
}

export function analysisView(state) {
  const user = state.companies.find(company => company.isUser);
  return `<h1>Analysis</h1><div class="subtitle">Diagnose why results occurred — not merely what happened.</div><div class="grid">
    <div class="card span6"><div class="section-title">Production & Logistics</div><table><tr><td>Potential Demand</td><td>${num(user.potentialDemand)}</td></tr><tr><td>Actual Sales</td><td>${num(user.sales)}</td></tr><tr><td>Unserved Demand</td><td>${num(Math.max(0,user.potentialDemand-user.sales))}</td></tr><tr><td>Production</td><td>${num(user.production)}</td></tr><tr><td>Capacity Utilization</td><td>${pct(user.production/Math.max(user.capacity,1))}</td></tr><tr><td>RM Inventory</td><td>${num(user.rawMaterial)}</td></tr><tr><td>FG Inventory</td><td>${num(user.finishedGoods)}</td></tr></table></div>
    <div class="card span6"><div class="section-title">Cost Structure</div><table><tr><td>Price / Unit</td><td>${money(user.price)}</td></tr><tr><td>Total Cost / Unit</td><td>${money(user.unitCost)}</td></tr><tr><td>Spread / Unit</td><td class="${user.price-user.unitCost>=0?'good':'bad'}">${money(user.price-user.unitCost)}</td></tr><tr><td>Profit Margin</td><td>${pct(user.profitMargin)}</td></tr><tr><td>ROE</td><td>${pct(user.roe)}</td></tr><tr><td>Current Ratio</td><td>${fixed(user.currentRatio,2)}x</td></tr></table>${diagnosticText(user)}</div></div>`;
}

export function financialsView(state) {
  const user = state.companies.find(company => company.isUser);
  return `<h1>Financial Statements</h1><div class="subtitle">Final reconciliation page for the current round.</div><div class="grid">
    <div class="card span4"><div class="section-title">Income Statement</div><table><tr><td>Revenue</td><td>${money(user.revenue)}</td></tr><tr><td>Total Unit Cost</td><td>${money(user.unitCost)}</td></tr><tr><td>Net Earnings</td><td class="${user.netProfit>=0?'good':'bad'}">${money(user.netProfit)}</td></tr><tr><td>Profit Margin</td><td>${pct(user.profitMargin)}</td></tr></table></div>
    <div class="card span4"><div class="section-title">Balance Sheet Snapshot</div><table><tr><td>Cash</td><td>${money(user.cash)}</td></tr><tr><td>Overdraft</td><td class="${user.overdraft?'bad':''}">${money(user.overdraft)}</td></tr><tr><td>Owners' Equity</td><td>${money(user.equity)}</td></tr><tr><td>Current Ratio</td><td>${fixed(user.currentRatio,2)}x</td></tr></table></div>
    <div class="card span4"><div class="section-title">Equity Metrics</div><table><tr><td>ROE</td><td>${pct(user.roe)}</td></tr><tr><td>Market Share</td><td>${pct(user.marketShare)}</td></tr><tr><td>Practice NPV</td><td>${money(user.npv)}</td></tr><tr><td>Balanced Score</td><td>${fixed(user.balancedScore,1)}</td></tr></table></div></div>`;
}

export function historyView(state) {
  const user = state.companies.find(company => company.isUser);
  return `<h1>Decision History</h1><div class="subtitle">Decision dan result untuk ronde yang sama disimpan pada baris yang sama.</div><div class="card table-card"><div class="table-wrap"><table><thead><tr><th>Round</th><th>Price</th><th>Marketing</th><th>R&D</th><th>Production</th><th>Sales</th><th>Revenue</th><th>Unit Cost</th><th>Net Profit</th><th>Δ Profit</th><th>NPV</th></tr></thead><tbody>${user.history.map((item,i)=>{const prev=user.history[i-1];const change=prev&&prev.netProfit?((item.netProfit-prev.netProfit)/Math.abs(prev.netProfit)):0;return `<tr><td>R${item.round}</td><td>${money(item.decision?.price||item.price)}</td><td>${money(item.decision?.marketing||0)}</td><td>${money(item.decision?.rd||0)}</td><td>${num(item.decision?.production||item.production)}</td><td>${num(item.sales)}</td><td>${money(item.revenue)}</td><td>${money(item.unitCost)}</td><td class="${item.netProfit>=0?'good':'bad'}">${money(item.netProfit)}</td><td class="${change>=0?'good':'bad'}">${i?pct(change):'—'}</td><td>${money(item.npv)}</td></tr>`}).join('')}</tbody></table></div></div>`;
}

export function leaderboardView(state) {
  const sorted = [...state.companies].sort((a,b)=>b.npv-a.npv);
  return `<h1>Leaderboard</h1><div class="subtitle">Ranking menggunakan Practice NPV proxy yang transparan.</div><div class="card table-card"><div class="table-wrap"><table><thead><tr><th>#</th><th>Company</th><th>Strategy</th><th>Practice NPV</th><th>Net Profit</th><th>Share</th><th>ROE</th><th>Score</th></tr></thead><tbody>${sorted.map((c,i)=>`<tr class="${c.isUser?'user-row':''}"><td class="${i===0?'rank1':''}">${i+1}</td><td>${esc(c.name)}</td><td>${esc(c.strategy)}</td><td>${money(c.npv)}</td><td class="${c.netProfit>=0?'good':'bad'}">${money(c.netProfit)}</td><td>${pct(c.marketShare)}</td><td>${pct(c.roe)}</td><td>${fixed(c.balancedScore,1)}</td></tr>`).join('')}</tbody></table></div></div>`;
}

export function scenariosView(state) {
  return `<h1>Scenario Center</h1><div class="subtitle">Surprise events dapat memengaruhi demand, raw material, atau capacity sejak Round 2.</div><div class="grid">
    <div class="card span4"><div class="section-title">Scenario Rules</div><button class="scenario-toggle ${state.surpriseMode?'on':''}" data-action="toggle-surprise"><strong>${state.surpriseMode?'ON':'OFF'}</strong><span>Surprise Events</span><small>Click to toggle.</small></button></div>
    <div class="card span8"><div class="section-title">Event History</div>${state.eventHistory?.length?state.eventHistory.map(e=>`<div class="event-item"><b>R${e.round}</b><div><strong>${esc(e.title)}</strong><span>${esc(e.text)}</span></div></div>`).join(''):'<div class="empty">Belum ada surprise event.</div>'}</div></div>`;
}

export function modelView() {
  return `<h1>Model Transparency</h1><div class="subtitle">Pisahkan observed calibration anchors dari training-model approximations.</div><div class="grid">
    <div class="card span7"><div class="section-title">Observed Anchors</div><div class="anchor-grid">${OBSERVED_ANCHORS.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong><small>Observed calibration anchor</small></div>`).join('')}</div></div>
    <div class="card span5"><div class="section-title">Training Proxies</div>${TRAINING_PROXY_NOTES.map(x=>`<div class="proxy-note">${esc(x)}</div>`).join('')}<div class="callout">Simulator tidak mengklaim mengetahui formula proprietary TopBoss.</div></div></div>`;
}

export function setupView(state) {
  const config = getSupabaseConfig();
  return `<h1>Room & Setup</h1><div class="subtitle">Local Practice langsung jalan; Supabase opsional untuk shared room.</div><div class="setup-grid">
    <div class="card"><div class="section-title">Current Game</div><div class="field"><label>Team Name</label><input id="setupTeam" value="${esc(state.teamName)}"></div><div class="actions"><button class="secondary" data-action="rename-team">Save Team Name</button><button class="danger" data-action="reset-game">Reset Game</button><button class="secondary" data-action="export-save">Export JSON</button><button class="secondary" data-action="import-save">Import JSON</button><input id="importFile" type="file" accept=".json,application/json" hidden></div>${state.roomCode?`<hr><div class="small">ROOM CODE</div><div class="code-box">${esc(state.roomCode)}</div><div class="small room-key-label">ROOM KEY</div><div class="code-box">${esc(state.roomKey)}</div>`:''}</div>
    <div class="card"><div class="section-title">Supabase Connection</div><div class="field"><label>Supabase Project URL</label><input id="supabaseUrl" placeholder="https://xxxxx.supabase.co" value="${esc(config.url||'')}"></div><div class="field spaced"><label>Supabase Anon / Publishable Key</label><input id="supabaseKey" type="password" placeholder="Public anon key" value="${esc(config.key||'')}"></div><div class="actions"><button class="primary" data-action="create-room">CREATE ONLINE ROOM</button></div><hr><div class="section-title">Join Existing Room</div><div class="field"><label>Room Code</label><input id="joinCode" placeholder="MBS-4821"></div><div class="field spaced"><label>Room Key</label><input id="joinKey" placeholder="XXXXXXXX"></div><div class="actions"><button class="secondary" data-action="join-room">JOIN ROOM</button></div><div class="callout">Gunakan public anon/publishable key saja. Jangan pernah menaruh service_role key di browser.</div></div>
  </div>`;
}

export function bodyForTab(state, activeTab) {
  switch (activeTab) {
    case 'decisions': return decisionsView(state);
    case 'status': return statusView(state);
    case 'analysis': return analysisView(state);
    case 'financials': return financialsView(state);
    case 'history': return historyView(state);
    case 'leaderboard': return leaderboardView(state);
    case 'scenarios': return scenariosView(state);
    case 'model': return modelView(state);
    case 'setup': return setupView(state);
    default: return dashboardView(state);
  }
}
