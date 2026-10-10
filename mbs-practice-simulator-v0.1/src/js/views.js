import { OBSERVED_ANCHORS, TRAINING_PROXY_NOTES } from './config.js';
import { getSupabaseConfig, isCaptain } from './supabase.js';
import { previewSensitivity } from './sensitivity.js';
import { esc, fixed, money, num, pct } from './utils.js';

const NAV_ICONS = {
  dashboard: '▦',
  decisions: '⌁',
  status: '◎',
  analysis: '▤',
  financials: '◫',
  history: '↺',
  leaderboard: '♛',
  scenarios: '✦',
  model: '◈',
  setup: '⚙'
};

function navButton(id, label, active) {
  return `<button data-tab="${id}" class="${active === id ? 'active' : ''}"><span class="nav-ico">${NAV_ICONS[id] || '•'}</span><span>${label}</span></button>`;
}

function cardHead(eyebrow, title, icon = '') {
  return `<div class="card-head"><div><span>${eyebrow}</span><h2>${title}</h2></div>${icon ? `<div class="head-ico">${icon}</div>` : ''}</div>`;
}

function statsList(rows) {
  return `<dl class="stats-list">${rows.map(([k, v, cls = '']) => `<div><dt>${k}</dt><dd class="${cls}">${v}</dd></div>`).join('')}</dl>`;
}

export function shell(state, activeTab, themePreference) {
  const timer = Math.max(0, Number(state.timerRemaining || 0));
  const mm = String(Math.floor(timer / 60)).padStart(2, '0');
  const ss = String(timer % 60).padStart(2, '0');

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">M</div>
          <div class="brand-copy"><strong>MBS ARENA</strong><small>Practice Simulator v0.2</small></div>
        </div>
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
          <strong>TRAINING MODEL</strong>
          <p>Independent practice engine. Proprietary TopBoss formulas remain unknown.</p>
        </div>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <div class="top-left">
            <strong>${esc(state.teamName)}</strong>
            <small>ROUND ${state.currentRound} / ${state.maxRounds}</small>
          </div>
          <div class="top-actions">
            <select id="modeSelect" class="top-control" aria-label="Simulation mode">
              <option value="training" ${state.mode === 'training' ? 'selected' : ''}>Training</option>
              <option value="competition" ${state.mode === 'competition' ? 'selected' : ''}>Competition</option>
              <option value="sandbox" ${state.mode === 'sandbox' ? 'selected' : ''}>Sandbox</option>
            </select>
            <span class="badge timer-badge ${state.mode === 'competition' && timer <= 120 ? 'danger-badge' : ''}">
              ${state.mode === 'competition' ? `◷ ${mm}:${ss}` : 'NO TIMER'}
            </span>
            <span class="badge" id="syncBadge">${state.roomCode ? '● Online' : '● Saved'}</span>
            <select id="themeSelect" class="top-control" aria-label="Theme">
              <option value="system" ${themePreference === 'system' ? 'selected' : ''}>◐ System</option>
              <option value="light" ${themePreference === 'light' ? 'selected' : ''}>☀ Light</option>
              <option value="dark" ${themePreference === 'dark' ? 'selected' : ''}>☾ Dark</option>
            </select>
          </div>
        </header>
        <main class="content" id="content"></main>
      </section>
    </div>`;
}

function metric(label, value, note, tone = '') {
  return `<div class="metric"><span class="label">${label}</span><strong class="value ${tone}">${value}</strong><small class="delta">${note}</small></div>`;
}

function diagnosticText(user) {
  const notes = [];
  if (user.unitCost > user.price) notes.push('<div class="alert bad-bg"><span class="alert-ico">!</span><div><strong>Unit cost melebihi selling price</strong><span>Setiap tambahan penjualan berisiko memperdalam rugi.</span></div></div>');
  if (user.overdraft > 0) notes.push(`<div class="alert bad-bg"><span class="alert-ico">!</span><div><strong>Overdraft aktif</strong><span>Likuiditas membutuhkan pembiayaan ${money(user.overdraft)}.</span></div></div>`);
  if (user.potentialDemand > user.sales * 1.15 && user.finishedGoods < user.sales * 0.05) notes.push('<div class="alert warn-bg"><span class="alert-ico">△</span><div><strong>Supply constraint</strong><span>Potential demand jauh di atas actual sales dan FG hampir habis.</span></div></div>');
  if (user.rawMaterial > user.production * 3) notes.push('<div class="alert warn-bg"><span class="alert-ico">△</span><div><strong>Raw material berlebih</strong><span>Working capital berpotensi tertahan di inventory.</span></div></div>');
  if (user.netProfit > 0 && user.currentRatio > 1.4) notes.push('<div class="alert good-bg"><span class="alert-ico">✓</span><div><strong>Financial health stabil</strong><span>Profit positif dan current ratio masih memadai.</span></div></div>');
  if (!notes.length) notes.push('<div class="alert good-bg"><span class="alert-ico">✓</span><div><strong>Belum ada alert ekstrem</strong><span>Indikator utama masih dalam zona latihan yang wajar.</span></div></div>');
  return `<div class="alert-list">${notes.join('')}</div>`;
}

export function dashboardView(state) {
  const user = state.companies.find(company => company.isUser);
  const sorted = [...state.companies].sort((a, b) => b.npv - a.npv);
  const rank = sorted.findIndex(c => c.isUser) + 1;
  const revenueMax = Math.max(...user.history.map(item => item.revenue), 1);
  const latestEvent = state.eventHistory?.at(-1);

  return `
    <div class="page-head">
      <div><div class="eyebrow">EXECUTIVE COCKPIT</div><h1>Dashboard</h1><p class="subtitle">Decision → operation → financial impact, dalam satu ronde yang konsisten.</p></div>
      <div class="actions"><button class="secondary" data-action="export-save">⇩ Export Save</button><button class="primary" data-action="goto-decisions" ${state.currentRound >= state.maxRounds ? 'disabled' : ''}>▶ Next Decision</button></div>
    </div>

    ${latestEvent ? `<div class="event"><span>✦</span><div><strong>Latest scenario: ${esc(latestEvent.title)}</strong><span class="event-copy">Round ${latestEvent.round} · ${esc(latestEvent.text)}</span></div></div>` : ''}

    <section class="metric-grid">
      ${metric('Practice NPV', money(user.npv), `Rank #${rank} dari ${sorted.length}`)}
      ${metric('Net Profit', money(user.netProfit), 'Current round', user.netProfit >= 0 ? 'good' : 'bad')}
      ${metric('Market Share', pct(user.marketShare), `Demand ${num(user.potentialDemand)}`)}
      ${metric('Unit Cost', money(user.unitCost), `Price ${money(user.price)}`, user.unitCost > user.price ? 'bad' : 'good')}
      ${metric('Cash', money(user.cash), user.overdraft ? `Overdraft ${money(user.overdraft)}` : 'No overdraft')}
      ${metric('Balanced Score', fixed(user.balancedScore, 1), 'Practice proxy / 100')}
    </section>

    <section class="dashboard-grid">
      <div class="card">
        ${cardHead('ROUND TREND', 'Revenue & Profit', '⌁')}
        <div class="trend-rows">
          ${user.history.map(item => `<div class="trend-row"><span>R${item.round}</span><div class="bar"><div style="width:${Math.max(4, item.revenue / revenueMax * 100)}%"></div></div><strong>${money(item.revenue)}</strong><em class="${item.netProfit >= 0 ? 'good' : 'bad'}">${money(item.netProfit)}</em></div>`).join('')}
        </div>
      </div>
      <div class="card">
        ${cardHead('HEALTH MONITOR', 'Management Alerts', '△')}
        ${diagnosticText(user)}
      </div>
    </section>`;
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
    <div class="page-head">
      <div><div class="eyebrow">ROUND ${Math.min(state.currentRound + 1, state.maxRounds)}</div><h1>Business Decisions</h1><p class="subtitle">Susun delapan keputusan utama. Competition Mode akan mengunci draft saat timer habis.</p></div>
      <button class="secondary" data-action="toggle-lock">▣ ${locked ? 'Unlock Draft' : 'Lock Draft'}</button>
    </div>

    ${locked ? `<div class="event"><span>▣</span><div><strong>Draft locked</strong><span class="event-copy">${esc(state.lockReason || 'Manual lock')}</span></div></div>` : ''}

    <section class="decision-layout">
      <div class="card">
        ${cardHead('MANAGEMENT INPUT', 'Decision Form', '⌁')}
        <div class="input-grid">
          ${field('Price', 'price', d.price, '0.10', '$ / unit', locked)}
          ${field('Marketing', 'marketing', d.marketing, '10000', '$', locked)}
          ${field('R&D', 'rd', d.rd, '10000', '$', locked)}
          ${field('Production Request', 'production', d.production, '1000', 'units', locked)}
          ${field('Material Purchase', 'materialPurchase', d.materialPurchase, '10000', 'units', locked)}
          ${field('Equipment Investment', 'equipment', d.equipment, '50000', '$', locked)}
          ${field('Maintenance', 'maintenance', d.maintenance, '10000', '$', locked)}
          ${field('Dividend', 'dividend', d.dividend, '10000', '$', locked)}
        </div>
        <div class="actions" style="margin-top:16px">
          <button class="primary" data-action="submit-round" ${complete || !captain || locked ? 'disabled' : ''}>▣ ${complete ? 'GAME COMPLETE' : captain ? 'Lock & Submit Round' : 'Captain Submits Round'}</button>
          <button class="secondary" data-action="load-r1">Load R1 Reference</button>
        </div>
      </div>

      <div class="side-stack">
        <div class="card">
          ${cardHead('OPERATING POSITION', 'Before Submit', '▦')}
          ${statsList([
            ['Potential Demand', num(user.potentialDemand)],
            ['Sales', num(user.sales)],
            ['Finished Goods', num(user.finishedGoods)],
            ['Capacity', num(user.capacity)],
            ['Raw Material', num(user.rawMaterial)],
            ['Cash', money(user.cash)]
          ])}
        </div>

        <div class="card sensitivity-card">
          ${cardHead('SENSITIVITY LAB', 'What-if Preview', '◎')}
          <div class="sensitivity-controls">
            <select id="sensitivityKey">
              <option value="price" ${state.sensitivity?.key === 'price' ? 'selected' : ''}>Price</option>
              <option value="marketing" ${state.sensitivity?.key === 'marketing' ? 'selected' : ''}>Marketing</option>
              <option value="rd" ${state.sensitivity?.key === 'rd' ? 'selected' : ''}>R&D</option>
              <option value="production" ${state.sensitivity?.key === 'production' ? 'selected' : ''}>Production</option>
            </select>
            <input id="sensitivityPct" type="number" value="${state.sensitivity?.deltaPct ?? 10}" step="1">
            <span>% change</span>
          </div>
          <div class="sensitivity-results">
            <div><span>Demand</span><strong class="${s.demandEffect >= 0 ? 'good' : 'bad'}">${s.demandEffect >= 0 ? '+' : ''}${fixed(s.demandEffect,1)}%</strong></div>
            <div><span>Revenue</span><strong class="${s.revenueEffect >= 0 ? 'good' : 'bad'}">${s.revenueEffect >= 0 ? '+' : ''}${fixed(s.revenueEffect,1)}%</strong></div>
            <div><span>Profit</span><strong class="${s.profitEffect >= 0 ? 'good' : 'bad'}">${s.profitEffect >= 0 ? '+' : ''}${fixed(s.profitEffect,1)}%</strong></div>
          </div>
          <div class="callout">Directional training estimate, bukan forecast resmi TopBoss.</div>
        </div>
      </div>
    </section>`;
}

function competitionTable(state) {
  const sorted = [...state.companies].sort((a, b) => b.marketShare - a.marketShare);
  return `<div class="table-wrap"><table><thead><tr><th>Company</th><th>Strategy</th><th>Quality</th><th>Image</th><th>Price</th><th>Sales</th><th>Share</th></tr></thead><tbody>${sorted.map(company => `<tr class="${company.isUser ? 'user-row' : ''}"><td>${esc(company.name)}</td><td>${esc(company.strategy)}</td><td>${fixed(company.quality,2)}</td><td>${fixed(company.image,2)}</td><td>${money(company.price)}</td><td>${num(company.sales)}</td><td>${pct(company.marketShare)}</td></tr>`).join('')}</tbody></table></div>`;
}

export function statusView(state) {
  const user = state.companies.find(company => company.isUser);
  const economy = state.economy;
  return `
    <div class="page-head"><div><div class="eyebrow">MARKET + OPERATIONS</div><h1>Status</h1><p class="subtitle">Apa yang terjadi setelah keputusan dijalankan.</p></div></div>
    <section class="triple-grid">
      <div class="card">${cardHead('ECONOMY','Economic Environment')}${statsList([['Price Index',economy?fixed(economy.priceIndex,2):'100.00'],['Growth Indicator',economy?fixed(economy.growth*100,2):'100.00'],['Seasonal Indicator',economy?fixed(economy.seasonal*100,2):'100.00']])}</div>
      <div class="card">${cardHead('PRODUCT','Image & Quality')}${statsList([['Quality',fixed(user.quality,3)],['Image',fixed(user.image,3)],['Price',money(user.price)]])}</div>
      <div class="card">${cardHead('OPERATIONS','Business Status')}${statsList([['Potential Demand',num(user.potentialDemand)],['Sales',num(user.sales)],['Market Share',pct(user.marketShare)],['FG Inventory',num(user.finishedGoods)],['Capacity',num(user.capacity)],['RM Inventory',num(user.rawMaterial)]])}</div>
    </section>
    <div class="card">${cardHead('COMPETITIVE INTELLIGENCE','Sales Status','◎')}${competitionTable(state)}</div>`;
}

export function analysisView(state) {
  const user = state.companies.find(company => company.isUser);
  return `
    <div class="page-head"><div><div class="eyebrow">DIAGNOSIS</div><h1>Analysis</h1><p class="subtitle">Bukan hanya apa yang terjadi, tetapi mengapa.</p></div></div>
    <section class="dashboard-grid">
      <div class="card">${cardHead('PRODUCTION & LOGISTICS','Supply Chain Diagnostic','▦')}${statsList([['Potential Demand',num(user.potentialDemand)],['Actual Sales',num(user.sales)],['Unserved Demand',num(Math.max(0,user.potentialDemand-user.sales))],['Production',num(user.production)],['Capacity Utilization',pct(user.production/Math.max(user.capacity,1))],['RM Inventory',num(user.rawMaterial)],['FG Inventory',num(user.finishedGoods)]])}</div>
      <div class="card">${cardHead('COST STRUCTURE','Unit Economics','$')}${statsList([['Price / Unit',money(user.price)],['Total Cost / Unit',money(user.unitCost)],['Spread / Unit',money(user.price-user.unitCost),user.price-user.unitCost>=0?'good':'bad'],['Profit Margin',pct(user.profitMargin)],['ROE',pct(user.roe)],['Current Ratio',fixed(user.currentRatio,2)+'x']])}${diagnosticText(user)}</div>
    </section>`;
}

export function financialsView(state) {
  const user = state.companies.find(company => company.isUser);
  return `
    <div class="page-head"><div><div class="eyebrow">FINAL RECONCILIATION</div><h1>Financial Statements</h1><p class="subtitle">Gunakan halaman ini sebagai pengecekan final setiap ronde.</p></div></div>
    <section class="triple-grid">
      <div class="card">${cardHead('FINANCIAL','Income Statement')}${statsList([['Revenue',money(user.revenue)],['Unit Cost',money(user.unitCost)],['Net Earnings',money(user.netProfit),user.netProfit>=0?'good':'bad'],['Profit Margin',pct(user.profitMargin)]])}</div>
      <div class="card">${cardHead('FINANCIAL','Balance Sheet Snapshot')}${statsList([['Cash',money(user.cash)],['Overdraft',money(user.overdraft),user.overdraft?'bad':''],["Owners' Equity",money(user.equity)],['Current Ratio',fixed(user.currentRatio,2)+'x']])}</div>
      <div class="card">${cardHead('FINANCIAL','Equity Metrics')}${statsList([['ROE',pct(user.roe)],['Market Share',pct(user.marketShare)],['Practice NPV',money(user.npv)],['Balanced Score',fixed(user.balancedScore,1)]])}</div>
    </section>`;
}

export function historyView(state) {
  const user = state.companies.find(company => company.isUser);
  return `
    <div class="page-head"><div><div class="eyebrow">ROUND DATABASE</div><h1>Decision History</h1><p class="subtitle">Decision dan result untuk ronde yang sama disimpan pada baris yang sama.</p></div></div>
    <div class="card table-card"><div class="table-wrap"><table><thead><tr><th>Round</th><th>Price</th><th>Marketing</th><th>R&D</th><th>Production</th><th>Sales</th><th>Revenue</th><th>Unit Cost</th><th>Net Profit</th><th>Δ Profit</th><th>NPV</th></tr></thead><tbody>${user.history.map((item,i)=>{const prev=user.history[i-1];const change=prev&&prev.netProfit?((item.netProfit-prev.netProfit)/Math.abs(prev.netProfit)):0;return `<tr><td>R${item.round}</td><td>${money(item.decision?.price||item.price)}</td><td>${money(item.decision?.marketing||0)}</td><td>${money(item.decision?.rd||0)}</td><td>${num(item.decision?.production||item.production)}</td><td>${num(item.sales)}</td><td>${money(item.revenue)}</td><td>${money(item.unitCost)}</td><td class="${item.netProfit>=0?'good':'bad'}">${money(item.netProfit)}</td><td class="${change>=0?'good':'bad'}">${i?pct(change):'—'}</td><td>${money(item.npv)}</td></tr>`}).join('')}</tbody></table></div></div>`;
}

export function leaderboardView(state) {
  const sorted = [...state.companies].sort((a,b)=>b.npv-a.npv);
  return `
    <div class="page-head"><div><div class="eyebrow">10-COMPANY MARKET</div><h1>Leaderboard</h1><p class="subtitle">Ranking menggunakan Practice NPV proxy yang transparan.</p></div></div>
    <div class="card table-card"><div class="table-wrap"><table><thead><tr><th>#</th><th>Company</th><th>Strategy</th><th>Practice NPV</th><th>Net Profit</th><th>Share</th><th>ROE</th><th>Score</th></tr></thead><tbody>${sorted.map((c,i)=>`<tr class="${c.isUser?'user-row':''}"><td class="${i===0?'rank1':''}">${i+1}</td><td>${esc(c.name)}</td><td>${esc(c.strategy)}</td><td>${money(c.npv)}</td><td class="${c.netProfit>=0?'good':'bad'}">${money(c.netProfit)}</td><td>${pct(c.marketShare)}</td><td>${pct(c.roe)}</td><td>${fixed(c.balancedScore,1)}</td></tr>`).join('')}</tbody></table></div></div>`;
}

export function scenariosView(state) {
  return `
    <div class="page-head"><div><div class="eyebrow">SURPRISE ROUND</div><h1>Scenario Center</h1><p class="subtitle">Event eksternal memengaruhi demand, raw material, atau capacity.</p></div></div>
    <section class="scenario-grid">
      <div class="card">
        ${cardHead('SETTINGS','Scenario Rules','⚙')}
        <button class="scenario-toggle ${state.surpriseMode?'on':''}" data-action="toggle-surprise"><strong>${state.surpriseMode?'ON':'OFF'}</strong><span>Surprise Events</span><small>Mulai berpeluang muncul sejak Round 2.</small></button>
      </div>
      <div class="card">
        ${cardHead('EVENT HISTORY','What Changed','✦')}
        ${state.eventHistory?.length?state.eventHistory.map(e=>`<div class="event-item"><b>R${e.round}</b><div><strong>${esc(e.title)}</strong><span>${esc(e.text)}</span></div></div>`).join(''):'<div class="empty">Belum ada surprise event.</div>'}
      </div>
    </section>`;
}

export function modelView() {
  return `
    <div class="page-head"><div><div class="eyebrow">AUDITABILITY</div><h1>Model Transparency</h1><p class="subtitle">Pisahkan observed calibration anchors dari training-model approximations.</p></div></div>
    <section class="dashboard-grid">
      <div class="card">
        ${cardHead('OBSERVED DATA','Calibration Anchors','◈')}
        <div class="anchor-grid">${OBSERVED_ANCHORS.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong><small>Observed calibration anchor</small></div>`).join('')}</div>
      </div>
      <div class="card">
        ${cardHead('TRAINING MODEL','Approximation Boundary','◈')}
        ${TRAINING_PROXY_NOTES.map(x=>`<div class="proxy-note">${esc(x)}</div>`).join('')}
        <div class="callout">Simulator tidak mengklaim mengetahui formula proprietary TopBoss.</div>
      </div>
    </section>`;
}

export function setupView(state) {
  const config = getSupabaseConfig();
  return `
    <div class="page-head"><div><div class="eyebrow">TEAM WORKSPACE</div><h1>Room & Setup</h1><p class="subtitle">Local Practice langsung jalan; Supabase opsional untuk shared room.</p></div></div>
    <div class="setup-grid">
      <div class="card">
        ${cardHead('CURRENT GAME','Game & Recovery','⚙')}
        <div class="field"><label><span>Team Name</span><span>identity</span></label><input id="setupTeam" value="${esc(state.teamName)}"></div>
        <div class="actions" style="margin-top:16px"><button class="secondary" data-action="rename-team">Save Team Name</button><button class="danger" data-action="reset-game">Reset Game</button><button class="secondary" data-action="export-save">⇩ Export JSON</button><button class="secondary" data-action="import-save">⇧ Import JSON</button><input id="importFile" type="file" accept=".json,application/json" hidden></div>
        ${state.roomCode?`<hr><div class="small">ROOM CODE</div><div class="code-box">${esc(state.roomCode)}</div><div class="small room-key-label">ROOM KEY</div><div class="code-box">${esc(state.roomKey)}</div>`:''}
      </div>
      <div class="card">
        ${cardHead('SHARED ROOM','Supabase Connection','◎')}
        <div class="field"><label><span>Supabase Project URL</span><span>public</span></label><input id="supabaseUrl" placeholder="https://xxxxx.supabase.co" value="${esc(config.url||'')}"></div>
        <div class="field spaced"><label><span>Supabase Anon / Publishable Key</span><span>public key</span></label><input id="supabaseKey" type="password" placeholder="Public anon key" value="${esc(config.key||'')}"></div>
        <div class="actions" style="margin-top:16px"><button class="primary" data-action="create-room">Create Online Room</button></div>
        <hr>
        <div class="card-head"><div><span>JOIN</span><h2>Existing Room</h2></div></div>
        <div class="field"><label><span>Room Code</span><span>e.g. MBS-4821</span></label><input id="joinCode" placeholder="MBS-4821"></div>
        <div class="field spaced"><label><span>Room Key</span><span>8 chars</span></label><input id="joinKey" placeholder="XXXXXXXX"></div>
        <div class="actions" style="margin-top:16px"><button class="secondary" data-action="join-room">Join Room</button></div>
        <div class="callout">Gunakan public anon/publishable key saja. Jangan pernah menaruh service_role key di browser.</div>
      </div>
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
