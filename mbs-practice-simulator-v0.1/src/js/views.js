import { ROLE_KEY } from './config.js';
import { esc, fixed, money, num, pct } from './utils.js';
import { getSupabaseConfig, isCaptain } from './supabase.js';

export const TABS = [
  ['dashboard', '◈ Dashboard'],
  ['decisions', '◎ Business Decisions'],
  ['status', '◫ Status'],
  ['analysis', '⌁ Analysis'],
  ['financials', '$ Financial Statements'],
  ['history', '↺ Decision History'],
  ['leaderboard', '★ Leaderboard'],
  ['setup', '⚙ Room & Setup']
];

export function shell(state, activeTab, body) {
  const user = state.companies.find(company => company.isUser);
  const nav = TABS.map(([tab, label]) => `
    <button data-tab="${tab}" class="${tab === activeTab ? 'active' : ''}">${label}</button>
  `).join('');

  return `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="logo">MBS <span>ARENA</span></div>
      <div class="sublogo">Practice Simulator v0.1</div>
      <div class="nav" id="nav">${nav}</div>
      <div class="sidebar-bottom">
        Training model based on observed MBS/TopBoss workflow.<br>
        Not an official TopBoss engine.
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <div class="team-title">${esc(user.name)}</div>
          <div class="small">MBS Practice Room</div>
        </div>
        <div class="topmeta">
          <span class="badge">${esc(state.roomCode || 'LOCAL')}</span>
          <span class="badge yellow">ROUND ${state.currentRound} / ${state.maxRounds}</span>
          <span class="badge" id="syncBadge">● Saved</span>
        </div>
      </header>
      <section class="content">${body}</section>
    </main>
  </div>`;
}

function metric(label, value, delta = '') {
  return `
    <div class="card metric">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="delta">${delta}</div>
    </div>`;
}

function diagnosticText(user) {
  const notes = [];
  if (user.potentialDemand > user.sales * 1.20 && user.finishedGoods < 10000) {
    notes.push('Demand exceeds available supply. Production/capacity may be constraining sales.');
  }
  if (user.unitCost > user.price) {
    notes.push('Unit cost is above selling price. Each additional sale may deepen losses.');
  }
  if (user.overdraft > 0) {
    notes.push('Company is using an overdraft. Procurement, CAPEX, or operating spending may be stressing liquidity.');
  }
  if (user.rawMaterial > user.production * 3) {
    notes.push('Raw-material inventory is high relative to production. Working capital may be trapped in inventory.');
  }
  if (user.marketShare > 0.10 && user.netProfit > 0) {
    notes.push('Strong competitive position with positive earnings.');
  }
  if (!notes.length) {
    notes.push('No extreme warning detected. Evaluate price, demand, capacity, cost, and liquidity together.');
  }
  return notes.map(note => `<div class="callout">${note}</div>`).join('');
}

export function dashboardView(state) {
  const user = state.companies.find(company => company.isUser);
  const progress = (state.currentRound / state.maxRounds) * 100;
  const revenueMax = Math.max(...user.history.map(item => item.revenue), 1);
  const ranking = [...state.companies]
    .sort((a, b) => b.npv - a.npv)
    .findIndex(company => company.isUser) + 1;

  const event = state.lastEvent ? `
    <div class="event">
      <strong>⚠ SURPRISE EVENT — ${esc(state.lastEvent.title)}</strong><br>
      ${esc(state.lastEvent.text)}
    </div>` : '';

  return `
    <h1>Executive Dashboard</h1>
    <div class="subtitle">Track your company from decision → operational result → financial outcome.</div>
    ${event}
    <div class="grid">
      ${metric('Practice NPV', money(user.npv), `Leaderboard rank #${ranking}`)}
      ${metric('Net Profit', money(user.netProfit), user.netProfit >= 0 ? 'Profitable' : 'Loss')}
      ${metric('Market Share', pct(user.marketShare), `Potential demand ${num(user.potentialDemand)}`)}
      ${metric('Unit Cost', money(user.unitCost), `Selling price ${money(user.price)}`)}
      ${metric('Cash', money(user.cash), user.overdraft ? `Overdraft ${money(user.overdraft)}` : 'No overdraft')}
      ${metric('Balanced Score', fixed(user.balancedScore, 1), 'Training score / 100')}

      <div class="card span8">
        <div class="section-title">Game Progress</div>
        <div class="progress"><div style="width:${progress}%"></div></div>
        <div class="rounds">
          ${[0,1,2,3,4].map(round => `
            <span class="${round < state.currentRound ? 'done' : round === state.currentRound ? 'current' : ''}">R${round}</span>
          `).join('')}
        </div>
        <hr>
        <div class="section-title">Revenue by Round</div>
        ${user.history.map(item => `
          <div class="bar-row">
            <span>Round ${item.round}</span>
            <div class="bar"><div style="width:${(item.revenue / revenueMax) * 100}%"></div></div>
            <strong>${money(item.revenue)}</strong>
          </div>
        `).join('')}
      </div>

      <div class="card span4">
        <div class="section-title">Management Brief</div>
        ${diagnosticText(user)}
        <div class="actions">
          <button class="primary" data-action="goto-decisions" ${state.currentRound >= state.maxRounds ? 'disabled' : ''}>
            ${state.currentRound >= state.maxRounds ? 'GAME COMPLETE' : 'MAKE NEXT DECISION'}
          </button>
        </div>
      </div>
    </div>`;
}

function field(label, key, value, step, unit) {
  return `
    <div class="field">
      <label><span>${label}</span><span>${unit}</span></label>
      <input type="number" data-decision="${key}" value="${Number(value).toFixed(key === 'price' ? 2 : 0)}" min="0" step="${step}">
    </div>`;
}

export function decisionsView(state) {
  const user = state.companies.find(company => company.isUser);
  const d = state.draft;
  const complete = state.currentRound >= state.maxRounds;
  const captain = isCaptain() || !state.roomCode;

  return `
    <h1>Business Decisions</h1>
    <div class="subtitle">Decision input for Round ${Math.min(state.currentRound + 1, state.maxRounds)}.</div>
    <div class="grid">
      <div class="card span8">
        <div class="section-title">Decision Form</div>
        <div class="input-grid">
          ${field('Price', 'price', d.price, '0.10', '$ / unit')}
          ${field('Marketing', 'marketing', d.marketing, '10000', '$')}
          ${field('R&D', 'rd', d.rd, '10000', '$')}
          ${field('Production Request', 'production', d.production, '1000', 'units')}
          ${field('Material Purchase', 'materialPurchase', d.materialPurchase, '10000', 'material units')}
          ${field('Equipment Investment', 'equipment', d.equipment, '50000', '$')}
          ${field('Maintenance', 'maintenance', d.maintenance, '10000', '$')}
          ${field('Dividend', 'dividend', d.dividend, '10000', '$')}
        </div>
        <div class="actions">
          <button class="primary" data-action="submit-round" ${complete || !captain ? 'disabled' : ''}>
            ${complete ? 'GAME COMPLETE' : captain ? 'LOCK & SUBMIT ROUND' : 'CAPTAIN SUBMITS ROUND'}
          </button>
          <button class="secondary" data-action="load-r1">Load R1 Reference</button>
        </div>
        ${!captain && state.roomCode ? `
          <div class="callout">You joined as a team member. You can edit the shared draft, but only the room creator is treated as Captain.</div>
        ` : ''}
      </div>

      <div class="card span4">
        <div class="section-title">Current Operating Position</div>
        <table>
          <tr><td>Potential Demand</td><td>${num(user.potentialDemand)}</td></tr>
          <tr><td>Sales</td><td>${num(user.sales)}</td></tr>
          <tr><td>Finished Goods</td><td>${num(user.finishedGoods)}</td></tr>
          <tr><td>Production Capacity</td><td>${num(user.capacity)}</td></tr>
          <tr><td>Raw Material</td><td>${num(user.rawMaterial)}</td></tr>
          <tr><td>Cash</td><td>${money(user.cash)}</td></tr>
          <tr><td>Overdraft</td><td>${money(user.overdraft)}</td></tr>
        </table>
        <div class="callout">High potential demand does not guarantee sales. Sales are constrained by available finished goods and production.</div>
      </div>
    </div>`;
}

function competitionTable(state) {
  const sorted = [...state.companies].sort((a, b) => b.marketShare - a.marketShare);
  return `
    <table>
      <thead><tr><th>Company</th><th>Strategy</th><th>Quality</th><th>Image</th><th>Price</th><th>Sales</th><th>Share</th></tr></thead>
      <tbody>
        ${sorted.map(company => `
          <tr>
            <td class="${company.isUser ? 'yellow' : ''}">${esc(company.name)}</td>
            <td>${esc(company.strategy)}</td>
            <td>${fixed(company.quality, 2)}</td>
            <td>${fixed(company.image, 2)}</td>
            <td>${money(company.price)}</td>
            <td>${num(company.sales)}</td>
            <td>${pct(company.marketShare)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

export function statusView(state) {
  const user = state.companies.find(company => company.isUser);
  const economy = state.economy;
  return `
    <h1>Status</h1>
    <div class="subtitle">Market and operational consequences of the latest submitted decisions.</div>
    <div class="grid">
      <div class="card span4">
        <div class="section-title">Economy</div>
        <table>
          <tr><td>Price Index</td><td>${economy ? fixed(economy.priceIndex, 2) : '100.00'}</td></tr>
          <tr><td>Growth Indicator</td><td>${economy ? fixed(economy.growth * 100, 2) : '100.00'}</td></tr>
          <tr><td>Seasonal Indicator</td><td>${economy ? fixed(economy.seasonal * 100, 2) : '100.00'}</td></tr>
        </table>
      </div>
      <div class="card span4">
        <div class="section-title">Product Image</div>
        <table>
          <tr><td>Product Quality</td><td>${fixed(user.quality, 3)}</td></tr>
          <tr><td>Product Image</td><td>${fixed(user.image, 3)}</td></tr>
          <tr><td>Selling Price</td><td>${money(user.price)}</td></tr>
        </table>
      </div>
      <div class="card span4">
        <div class="section-title">Business Status</div>
        <table>
          <tr><td>Potential Demand</td><td>${num(user.potentialDemand)}</td></tr>
          <tr><td>Sales Volume</td><td>${num(user.sales)}</td></tr>
          <tr><td>Market Share</td><td>${pct(user.marketShare)}</td></tr>
          <tr><td>FG Inventory</td><td>${num(user.finishedGoods)}</td></tr>
          <tr><td>Current Production</td><td>${num(user.production)}</td></tr>
          <tr><td>Next Capacity</td><td>${num(user.capacity)}</td></tr>
          <tr><td>RM Inventory</td><td>${num(user.rawMaterial)}</td></tr>
        </table>
      </div>
      <div class="card span12">
        <div class="section-title">Sales Status — Competitive Market</div>
        ${competitionTable(state)}
      </div>
    </div>`;
}

export function analysisView(state) {
  const user = state.companies.find(company => company.isUser);
  const supplyGap = user.potentialDemand - user.sales;
  const utilization = user.production / Math.max(user.capacity, 1);
  return `
    <h1>Analysis</h1>
    <div class="subtitle">Diagnose why results occurred — not merely what happened.</div>
    <div class="grid">
      <div class="card span6">
        <div class="section-title">Production & Logistics</div>
        <table>
          <tr><td>Potential Demand</td><td>${num(user.potentialDemand)}</td></tr>
          <tr><td>Actual Sales</td><td>${num(user.sales)}</td></tr>
          <tr><td>Unserved Demand</td><td>${num(Math.max(0, supplyGap))}</td></tr>
          <tr><td>Production</td><td>${num(user.production)}</td></tr>
          <tr><td>Capacity</td><td>${num(user.capacity)}</td></tr>
          <tr><td>Capacity Utilization</td><td>${pct(utilization)}</td></tr>
          <tr><td>Raw Material Inventory</td><td>${num(user.rawMaterial)}</td></tr>
          <tr><td>Finished Goods Inventory</td><td>${num(user.finishedGoods)}</td></tr>
        </table>
      </div>
      <div class="card span6">
        <div class="section-title">Cost Structure</div>
        <table>
          <tr><td>Selling Price / Unit</td><td>${money(user.price)}</td></tr>
          <tr><td>Total Cost / Unit</td><td>${money(user.unitCost)}</td></tr>
          <tr><td>Spread / Unit</td><td class="${user.price - user.unitCost >= 0 ? 'good' : 'bad'}">${money(user.price - user.unitCost)}</td></tr>
          <tr><td>Revenue</td><td>${money(user.revenue)}</td></tr>
          <tr><td>Net Profit</td><td>${money(user.netProfit)}</td></tr>
          <tr><td>Profit Margin</td><td>${pct(user.profitMargin)}</td></tr>
        </table>
        ${diagnosticText(user)}
      </div>
      <div class="card span12">
        <div class="section-title">Financial Ratios</div>
        <table>
          <thead><tr><th>Current Ratio</th><th>ROE</th><th>Profit Margin</th><th>Market Share</th><th>Balanced Score</th></tr></thead>
          <tbody><tr><td>${fixed(user.currentRatio, 2)}x</td><td>${pct(user.roe)}</td><td>${pct(user.profitMargin)}</td><td>${pct(user.marketShare)}</td><td>${fixed(user.balancedScore, 1)}</td></tr></tbody>
        </table>
      </div>
    </div>`;
}

export function financialsView(state) {
  const user = state.companies.find(company => company.isUser);
  const d = user.lastDecision || {};
  const rawIndex = state.economy?.rawIndex || 1;
  const purchaseCost = (d.materialPurchase || 0) * 1.15 * rawIndex;
  return `
    <h1>Financial Statements</h1>
    <div class="subtitle">Final reconciliation page for the current round.</div>
    <div class="grid">
      <div class="card span4"><div class="section-title">Income Statement</div><table>
        <tr><td>Revenue</td><td>${money(user.revenue)}</td></tr>
        <tr><td>Cost / Unit</td><td>${money(user.unitCost)}</td></tr>
        <tr><td>Net Earnings</td><td class="${user.netProfit >= 0 ? 'good' : 'bad'}">${money(user.netProfit)}</td></tr>
      </table></div>
      <div class="card span4"><div class="section-title">Balance Sheet Snapshot</div><table>
        <tr><td>Cash</td><td>${money(user.cash)}</td></tr>
        <tr><td>Raw Material</td><td>${num(user.rawMaterial)}</td></tr>
        <tr><td>Finished Goods</td><td>${num(user.finishedGoods)}</td></tr>
        <tr><td>Overdraft</td><td>${money(user.overdraft)}</td></tr>
        <tr><td>Owners' Equity</td><td>${money(user.equity)}</td></tr>
      </table></div>
      <div class="card span4"><div class="section-title">Cash Flow Drivers</div><table>
        <tr><td>Revenue</td><td>${money(user.revenue)}</td></tr>
        <tr><td>RM Purchase</td><td>${money(purchaseCost)}</td></tr>
        <tr><td>Equipment</td><td>${money(d.equipment || 0)}</td></tr>
        <tr><td>Dividend</td><td>${money(d.dividend || 0)}</td></tr>
        <tr><td>Ending Cash</td><td>${money(user.cash)}</td></tr>
      </table></div>
    </div>`;
}

export function historyView(state) {
  const user = state.companies.find(company => company.isUser);
  return `
    <h1>Decision History</h1>
    <div class="subtitle">Every row combines the decision and result for the same round.</div>
    <div class="card"><table>
      <thead><tr><th>Round</th><th>Price</th><th>Marketing</th><th>R&D</th><th>Production</th><th>RM Purchase</th><th>Sales</th><th>Revenue</th><th>Unit Cost</th><th>Net Profit</th><th>NPV</th></tr></thead>
      <tbody>${user.history.map(item => `
        <tr>
          <td>R${item.round}</td><td>${money(item.decision?.price || item.price)}</td><td>${money(item.decision?.marketing || 0)}</td>
          <td>${money(item.decision?.rd || 0)}</td><td>${num(item.decision?.production || item.production)}</td><td>${num(item.decision?.materialPurchase || 0)}</td>
          <td>${num(item.sales)}</td><td>${money(item.revenue)}</td><td>${money(item.unitCost)}</td>
          <td class="${item.netProfit >= 0 ? 'good' : 'bad'}">${money(item.netProfit)}</td><td>${money(item.npv)}</td>
        </tr>`).join('')}</tbody>
    </table></div>`;
}

export function leaderboardView(state) {
  const sorted = [...state.companies].sort((a, b) => b.npv - a.npv);
  return `
    <h1>Leaderboard</h1>
    <div class="subtitle">Ranking uses Practice NPV — a training proxy, not the proprietary TopBoss formula.</div>
    <div class="card"><table>
      <thead><tr><th>#</th><th>Company</th><th>Strategy</th><th>Practice NPV</th><th>Net Profit</th><th>Market Share</th><th>ROE</th><th>Balanced Score</th></tr></thead>
      <tbody>${sorted.map((company, index) => `
        <tr><td class="${index === 0 ? 'rank1' : ''}">${index + 1}</td><td class="${company.isUser ? 'yellow' : ''}">${esc(company.name)}</td><td>${esc(company.strategy)}</td>
        <td>${money(company.npv)}</td><td class="${company.netProfit >= 0 ? 'good' : 'bad'}">${money(company.netProfit)}</td><td>${pct(company.marketShare)}</td><td>${pct(company.roe)}</td><td>${fixed(company.balancedScore, 1)}</td></tr>
      `).join('')}</tbody>
    </table></div>`;
}

export function setupView(state) {
  const config = getSupabaseConfig();
  return `
    <h1>Room & Setup</h1>
    <div class="subtitle">Use Local Practice immediately, or connect Supabase for a shared team room.</div>
    <div class="setup-grid">
      <div class="card">
        <div class="section-title">Current Game</div>
        <div class="field"><label>Team Name</label><input id="setupTeam" value="${esc(state.teamName)}"></div>
        <div class="actions"><button class="secondary" data-action="rename-team">Save Team Name</button><button class="danger" data-action="reset-game">Reset Game</button></div>
        <hr>
        <label class="small"><input type="checkbox" id="surpriseToggle" ${state.surpriseMode ? 'checked' : ''}> Enable Surprise Events</label>
        ${state.roomCode ? `
          <hr><div class="small">ROOM CODE</div><div class="code-box">${esc(state.roomCode)}</div>
          <div class="small" style="margin-top:12px">ROOM KEY</div><div class="code-box">${esc(state.roomKey)}</div>
          <div class="callout">Share both values only with your teammates.</div>` : ''}
      </div>
      <div class="card">
        <div class="section-title">Supabase Connection</div>
        <div class="field"><label>Supabase Project URL</label><input id="supabaseUrl" placeholder="https://xxxxx.supabase.co" value="${esc(config.url || '')}"></div>
        <div class="field" style="margin-top:12px"><label>Supabase Anon / Publishable Key</label><input id="supabaseKey" type="password" placeholder="Public anon key" value="${esc(config.key || '')}"></div>
        <div class="actions"><button class="primary" data-action="create-room">CREATE ONLINE ROOM</button></div>
        <hr><div class="section-title">Join Existing Room</div>
        <div class="field"><label>Room Code</label><input id="joinCode" placeholder="MBS-4821"></div>
        <div class="field" style="margin-top:12px"><label>Room Key</label><input id="joinKey" placeholder="XXXXXXXX"></div>
        <div class="actions"><button class="secondary" data-action="join-room">JOIN ROOM</button></div>
        <div class="callout">Use the public anon/publishable key only. Never place the Supabase service_role key in this browser app.</div>
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
    case 'setup': return setupView(state);
    default: return dashboardView(state);
  }
}
