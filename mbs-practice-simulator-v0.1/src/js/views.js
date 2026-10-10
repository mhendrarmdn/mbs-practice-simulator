import { OBSERVED_ANCHORS, OPTIMIZER_RISK_PROFILES, SCENARIO_PRESETS, STRATEGY_GOALS, TRAINING_PROXY_NOTES } from './config.js';
import { getRoomSession, getSupabaseConfig, isCaptain } from './supabase.js';
import { previewSensitivity } from './sensitivity.js';
import { calibrationReport, draftReadiness, roundDebrief } from './decisionIntel.js';
import { decisionMatrices } from './decisionMatrix.js';
import { competitionSnapshot, presentationBrief, strategyBrief, stressTestDraft } from './competitionCenter.js';
import { buildRound6Review, workbookStage } from './workbookLab.js';
import { strategyAlignment, strategyComparison } from './strategySystem.js';
import { robustOptimize } from './robustOptimizer.js';
import { availableFinancialRounds, financialForRound } from './financialStatement.js';
import { esc, fixed, money, num, pct } from './utils.js';

const NAV_ICONS = {
  dashboard: '▦',
  competition: '◆',
  workbook: 'W',
  strategy: 'S',
  optimizer: 'O',
  decisions: '⌁',
  status: '◎',
  analysis: '▤',
  ratios: '%',
  financials: '◫',
  history: '↺',
  matrix: '▥',
  leaderboard: '♛',
  scenarios: '✦',
  model: '◈',
  setup: '⚙'
};

function navButton(id, label, active) {
  return `<button data-tab="${id}" class="${active === id ? 'active' : ''}" title="${esc(label)}"><span class="nav-ico">${NAV_ICONS[id] || '•'}</span><span class="nav-text">${label}</span></button>`;
}

function navGroup(label, items, active) {
  return `<div class="nav-group"><span class="nav-group-label">${label}</span>${items.map(([id,text])=>navButton(id,text,active)).join('')}</div>`;
}

function cardHead(eyebrow, title, icon = '') {
  return `<div class="card-head"><div><span>${eyebrow}</span><h2>${title}</h2></div>${icon ? `<div class="head-ico">${icon}</div>` : ''}</div>`;
}

function statsList(rows) {
  return `<dl class="stats-list">${rows.map(([k, v, cls = '']) => `<div><dt>${k}</dt><dd class="${cls}">${v}</dd></div>`).join('')}</dl>`;
}

function roomPresence(state) {
  if (!state.roomCode) return '';
  const members = state.roomMembers || [];
  return `<div class="presence-list">${members.length ? members.map(member => `
    <div class="presence-row">
      <span class="presence-dot ${member.online ? 'online' : ''}"></span>
      <div><strong>${esc(member.displayName || 'Member')}</strong><small>${member.role === 'captain' ? 'Captain' : 'Member'} · ${member.online ? 'online' : 'away'}</small></div>
    </div>`).join('') : '<div class="empty">Presence belum tersedia. Jalankan schema v0.3 untuk member list.</div>'}</div>`;
}

export function shell(state, activeTab, themePreference, ui = {}) {
  const timer = Math.max(0, Number(state.timerRemaining || 0));
  const mm = String(Math.floor(timer / 60)).padStart(2, '0');
  const ss = String(timer % 60).padStart(2, '0');
  const session = getRoomSession();
  const online = (state.roomMembers || []).filter(member => member.online).length;
  const collapsed = Boolean(ui.sidebarCollapsed);

  return `
    <div class="app-shell ${collapsed ? 'sidebar-is-collapsed' : ''}">
      <aside class="sidebar ${collapsed ? 'collapsed' : ''}">
        <div class="brand">
          <div class="brand-mark">M</div>
          <div class="brand-copy"><strong>MBS ARENA</strong><small>Practice Simulator v1.0</small></div>
          <button class="sidebar-toggle" data-action="toggle-sidebar" aria-label="Tutup sidebar" title="Tutup sidebar">‹</button>
        </div>
        <nav class="nav">
          ${navGroup('MANAGEMENT', [
            ['dashboard','Management Dashboard'],
            ['decisions','Business Decisions'],
            ['history','Decision History']
          ], activeTab)}
          ${navGroup('STATUS', [
            ['status','Status / Business Status']
          ], activeTab)}
          ${navGroup('ANALYSIS', [
            ['analysis','Operations Analysis'],
            ['ratios','Financial Ratio'],
            ['matrix','Decision Matrices']
          ], activeTab)}
          ${navGroup('PERFORMANCE', [
            ['financials','Financial Statement'],
            ['leaderboard','Leaderboard']
          ], activeTab)}
          ${navGroup('PRACTICE LABS', [
            ['competition','Competition Center'],
            ['workbook','Workbook Lab'],
            ['strategy','Strategy Lab'],
            ['optimizer','Robust Optimizer'],
            ['scenarios','Scenario Center'],
            ['model','Model Transparency'],
            ['setup','Room & Setup']
          ], activeTab)}
        </nav>
        <div class="sidebar-bottom">
          <strong>TRAINING MODEL</strong>
          <p>Independent practice engine. Proprietary TopBoss formulas remain unknown.</p>
        </div>
      </aside>
      <button class="sidebar-scrim" data-action="toggle-sidebar" aria-label="Tutup sidebar"></button>

      <section class="workspace">
        <header class="topbar">
          <div class="top-left top-left-with-menu">
            <button class="hamburger" data-action="toggle-sidebar" aria-label="${collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}" title="${collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}"><span></span><span></span><span></span></button>
            <div>
              <strong>${esc(state.teamName)}</strong>
              <small>ROUND ${state.currentRound} / ${state.maxRounds}${state.roomCode ? ` · ${esc(session.role || 'room')}` : ''}</small>
            </div>
          </div>
          <div class="top-actions">
            <select id="modeSelect" class="top-control" aria-label="Simulation mode" ${state.roomCode && !isCaptain() ? 'disabled' : ''}>
              <option value="training" ${state.mode === 'training' ? 'selected' : ''}>Training</option>
              <option value="competition" ${state.mode === 'competition' ? 'selected' : ''}>Competition</option>
              <option value="sandbox" ${state.mode === 'sandbox' ? 'selected' : ''}>Sandbox</option>
              <option value="workbook" ${state.mode === 'workbook' ? 'selected' : ''}>Workbook R0–R5 + R6 Plan</option>
            </select>
            <span class="badge timer-badge ${state.mode === 'competition' && timer <= 120 ? 'danger-badge' : ''}">
              ${state.mode === 'competition' ? `◷ ${mm}:${ss}` : 'NO TIMER'}
            </span>
            <span class="badge" id="syncBadge">${state.roomCode ? `● ${online || 1} online` : '● Saved'}</span>
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
  const debrief = roundDebrief(state);

  return `
    <div class="page-head">
      <div><div class="eyebrow">EXECUTIVE COCKPIT</div><h1>Dashboard</h1><p class="subtitle">Decision → operation → financial impact, dalam satu ronde yang konsisten.</p></div>
      <div class="actions"><button class="secondary" data-action="export-save">⇩ Export Save</button><button class="primary" data-action="goto-decisions" ${state.currentRound >= state.maxRounds && state.mode !== 'workbook' ? 'disabled' : ''}>▶ ${state.mode === 'workbook' && state.currentRound >= state.maxRounds ? 'Open R6 Plan' : 'Next Decision'}</button></div>
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
        <div class="trend-rows">${user.history.map(item => `<div class="trend-row"><span>R${item.round}</span><div class="bar"><div style="width:${Math.max(4, item.revenue / revenueMax * 100)}%"></div></div><strong>${money(item.revenue)}</strong><em class="${item.netProfit >= 0 ? 'good' : 'bad'}">${money(item.netProfit)}</em></div>`).join('')}</div>
      </div>
      <div class="card">
        ${cardHead('HEALTH MONITOR', 'Management Alerts', '△')}
        ${diagnosticText(user)}
      </div>
    </section>
    <section class="card debrief-card">
      ${cardHead('ROUND DEBRIEF', debrief.headline, '◈')}
      <div class="debrief-grid">${debrief.items.map((item,index)=>`<div><b>${String(index+1).padStart(2,'0')}</b><span>${esc(item)}</span></div>`).join('')}</div>
    </section>`;
}

function field(label, key, value, step, unit, disabled) {
  return `<div class="field"><label><span>${label}</span><span>${unit}</span></label><input type="number" data-decision="${key}" value="${Number(value).toFixed(key === 'price' ? 2 : 0)}" min="0" step="${step}" ${disabled ? 'disabled' : ''}></div>`;
}


function stressTone(row) {
  if (row.netProfit < 0 || row.overdraft > 0) return 'bad';
  if (row.netProfit > 0 && row.cash > 0) return 'good';
  return 'warn';
}

export function competitionView(state) {
  const snap = competitionSnapshot(state);
  const stress = stressTestDraft(state);
  const strategy = strategyBrief(state);
  const brief = presentationBrief(state);
  const user = snap.user;

  return `
    <div class="page-head">
      <div>
        <div class="eyebrow">COMPETITION COMMAND CENTER</div>
        <h1>Competition Center</h1>
        <p class="subtitle">Gabungkan PDCA, current position, downside stress-test, dan presentation-ready evidence sebelum mengambil keputusan ronde berikutnya.</p>
      </div>
      <div class="actions">
        <button class="secondary" data-action="export-competition-brief">⇩ Export Competition Brief</button>
        <button class="primary" data-action="goto-decisions" ${state.currentRound >= state.maxRounds && state.mode !== 'workbook' ? 'disabled' : ''}>▶ ${state.mode === 'workbook' && state.currentRound >= state.maxRounds ? 'Open R6 Plan' : 'Open Decision Room'}</button>
      </div>
    </div>

    <section class="competition-kpis">
      ${metric('Practice NPV Rank', '#'+snap.rank+' / '+snap.competitors, snap.npvGapToLeader ? 'Gap '+money(snap.npvGapToLeader)+' to leader' : 'Current leader')}
      ${metric('Practice NPV', money(user.npv), 'Primary practice value proxy')}
      ${metric('Cumulative Profit', money(snap.cumulativeProfit), 'Submitted rounds only', snap.cumulativeProfit >= 0 ? 'good' : 'bad')}
      ${metric('Cumulative Dividend', money(snap.cumulativeDividend), 'Cash distributed')}
      ${metric('ROE', pct(user.roe), 'Current round', user.roe >= 0 ? 'good' : 'bad')}
      ${metric('Rounds Remaining', String(snap.roundsRemaining), state.currentRound >= state.maxRounds ? 'Game complete' : 'Horizon matters')}
    </section>

    <section class="pdca-strip">
      <div><b>PLAN</b><span>Define objective, draft, and risk guardrails.</span></div>
      <div><b>DO</b><span>Captain locks and submits one coherent decision set.</span></div>
      <div><b>CHECK</b><span>Read market, operations, finance, and decision matrices.</span></div>
      <div><b>ADJUST</b><span>Use debrief + stress test to change the next-round plan.</span></div>
    </section>

    <section class="dashboard-grid competition-main-grid">
      <div class="card">
        ${cardHead('DOWNSIDE / UPSIDE', 'Draft Scenario Stress Test', '◇')}
        ${stress.available ? `
          <div class="table-wrap"><table><thead><tr><th>Scenario</th><th>Profit</th><th>Cash</th><th>Overdraft</th><th>Share</th><th>Unit Cost</th><th>Δ Practice NPV</th></tr></thead>
          <tbody>${stress.rows.map(row=>`<tr>
            <td>${esc(row.label)}</td>
            <td class="${stressTone(row)}">${money(row.netProfit)}</td>
            <td>${money(row.cash)}</td>
            <td class="${row.overdraft>0?'bad':''}">${money(row.overdraft)}</td>
            <td>${pct(row.marketShare)}</td>
            <td>${money(row.unitCost)}</td>
            <td class="${row.npvDelta>=0?'good':'bad'}">${row.npvDelta>=0?'+':''}${money(row.npvDelta)}</td>
          </tr>`).join('')}</tbody></table></div>
          <div class="callout">Stress test menjalankan draft yang sama pada lima macro presets di salinan state terpisah. Ini adalah training-model scenario analysis, bukan forecast resmi.</div>
        ` : '<div class="empty">Game sudah mencapai ronde maksimum; stress test next-round tidak tersedia.</div>'}
      </div>

      <div class="side-stack">
        <div class="card">
          ${cardHead('DECISION THESIS', 'Next-Round Priorities', '◎')}
          <div class="brief-list numbered">${strategy.priorities.map((item,index)=>`<div><b>${index+1}</b><span>${esc(item)}</span></div>`).join('')}</div>
        </div>
        <div class="card">
          ${cardHead('RISK CONTROL', 'Guardrails', '△')}
          <div class="brief-list">${strategy.guardrails.map(item=>`<div><b>•</b><span>${esc(item)}</span></div>`).join('')}</div>
        </div>
      </div>
    </section>

    <section class="presentation-grid">
      <div class="card">
        ${cardHead('PRESENTATION READY', 'Key Issues', '01')}
        <div class="brief-list">${brief.keyIssues.map(item=>`<div><b>•</b><span>${esc(item)}</span></div>`).join('')}</div>
      </div>
      <div class="card">
        ${cardHead('PRESENTATION READY', 'Analysis', '02')}
        <div class="brief-list">${brief.analysis.map(item=>`<div><b>•</b><span>${esc(item)}</span></div>`).join('')}</div>
      </div>
      <div class="card">
        ${cardHead('PRESENTATION READY', 'Evaluation', '03')}
        <div class="brief-list">${brief.evaluation.map(item=>`<div><b>•</b><span>${esc(item)}</span></div>`).join('')}</div>
      </div>
      <div class="card">
        ${cardHead('Q&A DRILL', 'Questions to Defend', '?')}
        <div class="brief-list">${brief.qa.map(item=>`<div><b>Q</b><span>${esc(item)}</span></div>`).join('')}</div>
      </div>
    </section>
  `;
}


export function workbookView(state) {
  const stage = workbookStage(state);
  const review = buildRound6Review(state);
  const plan = state.workbookPlan;
  const progress = [0,1,2,3,4,5].map(round => ({
    round,
    done: state.currentRound >= round
  }));

  return `
    <div class="page-head">
      <div>
        <div class="eyebrow">STUDENT WORKBOOK FLOW</div>
        <h1>Workbook Lab</h1>
        <p class="subtitle">Workbook exercise = hasil R0–R5 untuk controlling, lalu Round 6 dibuat sebagai business plan saja dan tidak disimulasikan.</p>
      </div>
      <div class="actions">
        <button class="secondary" data-action="export-workbook-excel">▦ Export Excel</button>
        <button class="secondary" data-action="export-workbook-plan" ${!stage.resultsComplete ? 'disabled' : ''}>⇩ Export R6 Plan</button>
        <button class="primary" data-action="goto-decisions">${stage.resultsComplete ? 'Open Round 6 Plan' : 'Continue Workbook Round'}</button>
      </div>
    </div>

    <section class="workbook-flow">
      ${progress.map(item=>`<div class="${item.done ? 'done' : ''}"><b>R${item.round}</b><span>${item.round===0?'Baseline':item.done?'Result captured':'Pending'}</span></div>`).join('')}
      <div class="${stage.resultsComplete ? 'plan-ready' : ''}"><b>R6</b><span>PLAN ONLY</span></div>
    </section>

    <section class="dashboard-grid">
      <div class="card">
        ${cardHead('CONTROL / CHECK', 'R0–R5 Review', '▥')}
        <div class="brief-list">${review.observations.map(item=>`<div><b>•</b><span>${esc(item)}</span></div>`).join('')}</div>
        ${!stage.resultsComplete ? `<div class="callout">Selesaikan simulated results sampai Round 5. Setelah itu simulator tidak akan menghasilkan result Round 6.</div>` : ''}
      </div>

      <div class="card">
        ${cardHead('PLAN / ADJUST', 'Round 6 Planning Rationale', 'W')}
        <div class="brief-list">${review.rationale.map(item=>`<div><b>•</b><span>${esc(item)}</span></div>`).join('')}</div>
        ${stage.resultsComplete ? `<div class="callout"><strong>Workbook rule:</strong> Round 6 berisi keputusan manajemen, tetapi revenue/sales/profit/share/financial result R6 sengaja tidak dibuat.</div>` : ''}
      </div>
    </section>

    ${stage.resultsComplete ? `
      <section class="card workbook-plan-card">
        ${cardHead(plan ? 'FINALIZED PLAN' : 'DRAFT PLAN', 'Round 6 — Eight Management Decisions', '06')}
        <div class="workbook-decision-grid">
          ${review.decisionSummary.map(([label,value])=>`<div><span>${esc(label)}</span><strong>${label==='Price'?money(value):num(value)}</strong></div>`).join('')}
        </div>
        <div class="workbook-no-result">
          <b>NO R6 RESULT</b>
          <span>Tidak ada simulated Revenue, Sales, Market Share, Earnings, Cash, Equity, atau NPV untuk R6 Workbook Planning.</span>
        </div>
        <div class="actions">
          ${plan ? '<button class="secondary" data-action="reopen-workbook-plan">Reopen R6 Plan</button>' : '<button class="primary" data-action="goto-decisions">Edit / Finalize R6 Plan</button>'}
        </div>
      </section>
    ` : ''}
  `;
}


export function strategyView(state) {
  const current = strategyAlignment(state);
  const comparison = strategyComparison(state);
  const captain = isCaptain() || !state.roomCode;

  return `
    <div class="page-head">
      <div>
        <div class="eyebrow">OBJECTIVE-DRIVEN MANAGEMENT</div>
        <h1>Strategy Lab</h1>
        <p class="subtitle">Pilih tujuan utama tim. Alignment score kemudian membaca draft yang sama melalui objective yang berbeda, bukan satu aturan universal.</p>
      </div>
      <div class="actions">
        <select id="strategyGoal" class="top-control strategy-select" ${!captain ? 'disabled' : ''}>
          ${Object.entries(STRATEGY_GOALS).map(([key,goal])=>`<option value="${key}" ${state.strategyGoal===key?'selected':''}>${esc(goal.label)}</option>`).join('')}
        </select>
        <button class="primary" data-action="goto-decisions">Open Decision Room</button>
      </div>
    </div>

    <section class="strategy-hero">
      <div class="strategy-score-card">
        <span>SELECTED OBJECTIVE</span>
        <h2>${esc(current.goal.label)}</h2>
        <p>${esc(current.goal.description)}</p>
        <div class="strategy-big-score"><strong>${current.score}</strong><b>/100</b><em>Alignment</em></div>
      </div>
      <div class="card">
        ${cardHead('SIGNAL MAP','Objective Components','◎')}
        <div class="signal-grid">
          ${Object.entries(current.signals).map(([key,value])=>`<div><span>${esc(key)}</span><div class="signal-bar"><i style="width:${value}%"></i></div><strong>${value}</strong></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="dashboard-grid strategy-guidance">
      <div class="card">
        ${cardHead('PRIORITIES','What This Goal Wants Next','01')}
        <div class="brief-list numbered">${current.priorities.map((item,index)=>`<div><b>${index+1}</b><span>${esc(item)}</span></div>`).join('')}</div>
      </div>
      <div class="card">
        ${cardHead('GUARDRAILS','What Not To Break','△')}
        <div class="brief-list">${current.guardrails.map(item=>`<div><b>•</b><span>${esc(item)}</span></div>`).join('')}</div>
      </div>
    </section>

    <section class="card strategy-comparison-card">
      ${cardHead('OBJECTIVE COMPARISON','How The Same Draft Scores Under Different Goals','S')}
      <div class="strategy-comparison">
        ${comparison.map(item=>`
          <div class="${item.goalKey===state.strategyGoal?'selected':''}">
            <span>${esc(item.goal.label)}</span>
            <strong>${item.score}</strong>
            <small>${esc(item.goal.short)}</small>
          </div>`).join('')}
      </div>
      <div class="callout">Strategy Alignment adalah decision-support heuristic. Nilai tinggi berarti draft lebih konsisten dengan objective yang dipilih, bukan jaminan NPV atau kemenangan.</div>
    </section>
  `;
}


function optimizerTone(value) {
  return value >= 75 ? 'good' : value >= 55 ? 'warn' : 'bad';
}

export function optimizerView(state) {
  const result = robustOptimize(state, state.optimizerRisk || 'balanced');
  const captain = isCaptain() || !state.roomCode;

  if (!result.available) {
    return `
      <div class="page-head">
        <div><div class="eyebrow">ROBUST DECISION SEARCH</div><h1>Robust Optimizer</h1><p class="subtitle">Scenario-based candidate ranking inside the transparent training model.</p></div>
      </div>
      <div class="card">
        ${cardHead('OPTIMIZER STATUS','Not Available','O')}
        <div class="callout">${esc(result.reason || 'Optimizer unavailable.')}</div>
      </div>`;
  }

  const best = result.best;
  const current = result.current;

  return `
    <div class="page-head">
      <div>
        <div class="eyebrow">ROBUST DECISION SEARCH</div>
        <h1>Robust Optimizer</h1>
        <p class="subtitle">Uji candidate drafts terhadap lima macro scenarios, strategy goal terpilih, dan downside risk. Hasilnya adalah decision-support ranking, bukan official TopBoss optimum.</p>
      </div>
      <div class="actions">
        <select id="optimizerRisk" class="top-control optimizer-select" ${!captain ? 'disabled' : ''}>
          ${Object.entries(OPTIMIZER_RISK_PROFILES).map(([key,p])=>`<option value="${key}" ${result.riskProfile===key?'selected':''}>${esc(p.label)}</option>`).join('')}
        </select>
        <button class="secondary" data-action="export-optimizer-brief">⇩ Export Optimizer Brief</button>
        <button class="primary" data-action="apply-optimizer-draft" ${!captain || state.decisionLocked ? 'disabled' : ''}>Apply Recommended Draft</button>
      </div>
    </div>

    <section class="optimizer-kpis">
      ${metric('Robust Score', best.robustScore+'/100', esc(best.name), optimizerTone(best.robustScore))}
      ${metric('vs Current Draft', (result.improvement>=0?'+':'')+result.improvement+' pts', 'Robust score improvement', result.improvement>=0?'good':'bad')}
      ${metric('Avg Alignment', best.avgAlignment+'/100', 'Across 5 scenarios', optimizerTone(best.avgAlignment))}
      ${metric('Avg NPV Δ', money(best.avgNpvDelta), 'Practice NPV proxy', best.avgNpvDelta>=0?'good':'bad')}
      ${metric('Worst NPV Δ', money(best.worstNpvDelta), 'Downside scenario', best.worstNpvDelta>=0?'good':'bad')}
      ${metric('Liquidity Safety', best.liquiditySafety+'/100', 'Overdraft resilience', optimizerTone(best.liquiditySafety))}
    </section>

    <section class="dashboard-grid optimizer-main-grid">
      <div class="card">
        ${cardHead('RECOMMENDED CANDIDATE', best.name, 'O')}
        <div class="optimizer-decision-grid">
          ${[
            ['Price',best.decision.price,'money'],
            ['Marketing',best.decision.marketing,'num'],
            ['R&D',best.decision.rd,'num'],
            ['Production',best.decision.production,'num'],
            ['Procurement',best.decision.materialPurchase,'num'],
            ['Equipment',best.decision.equipment,'num'],
            ['Maintenance',best.decision.maintenance,'num'],
            ['Dividend',best.decision.dividend,'num']
          ].map(([label,value,type])=>`<div><span>${label}</span><strong>${type==='money'?money(value):num(value)}</strong></div>`).join('')}
        </div>
        <div class="callout">${esc(result.profile.description)} Strategy Goal: <strong>${esc(state.strategyGoal)}</strong>.</div>
      </div>

      <div class="card">
        ${cardHead('ROBUSTNESS PROFILE','Best Candidate','◇')}
        ${statsList([
          ['Robust Score',best.robustScore+'/100',optimizerTone(best.robustScore)],
          ['Average Strategy Alignment',best.avgAlignment+'/100',optimizerTone(best.avgAlignment)],
          ['Liquidity Safety',best.liquiditySafety+'/100',optimizerTone(best.liquiditySafety)],
          ['Scenario Volatility',best.volatility,best.volatility<=20?'good':best.volatility<=35?'warn':'bad'],
          ['Average Profit',money(best.avgProfit),best.avgProfit>=0?'good':'bad'],
          ['Average Market Share',pct(best.avgShare)]
        ])}
      </div>
    </section>

    <section class="card optimizer-table-card">
      ${cardHead('CANDIDATE RANKING','Top Decision Sets','▤')}
      <div class="table-wrap"><table><thead><tr><th>#</th><th>Candidate</th><th>Robust</th><th>Avg Align</th><th>Avg NPV Δ</th><th>Worst NPV Δ</th><th>Liquidity</th><th>Volatility</th></tr></thead>
      <tbody>${result.candidates.slice(0,8).map((c,i)=>`<tr class="${c.name==='Current Draft'?'user-row':''}"><td>${i+1}</td><td>${esc(c.name)}</td><td class="${optimizerTone(c.robustScore)}">${c.robustScore}</td><td>${c.avgAlignment}</td><td class="${c.avgNpvDelta>=0?'good':'bad'}">${money(c.avgNpvDelta)}</td><td class="${c.worstNpvDelta>=0?'good':'bad'}">${money(c.worstNpvDelta)}</td><td>${c.liquiditySafety}</td><td>${c.volatility}</td></tr>`).join('')}</tbody></table></div>
    </section>

    <section class="card optimizer-scenarios-card">
      ${cardHead('SCENARIO ROBUSTNESS', best.name, '◎')}
      <div class="table-wrap"><table><thead><tr><th>Scenario</th><th>Alignment</th><th>Profit</th><th>Cash</th><th>Overdraft</th><th>Share</th><th>Unit Cost</th><th>NPV Δ</th></tr></thead>
      <tbody>${best.outcomes.map(o=>`<tr><td>${esc(o.scenarioLabel)}</td><td>${o.alignment}</td><td class="${o.netProfit>=0?'good':'bad'}">${money(o.netProfit)}</td><td>${money(o.cash)}</td><td class="${o.overdraft>0?'bad':''}">${money(o.overdraft)}</td><td>${pct(o.marketShare)}</td><td>${money(o.unitCost)}</td><td class="${o.npvDelta>=0?'good':'bad'}">${money(o.npvDelta)}</td></tr>`).join('')}</tbody></table></div>
      <div class="callout">${esc(result.disclaimer)}</div>
    </section>
  `;
}

export function decisionsView(state) {
  const user = state.companies.find(company => company.isUser);
  const d = state.draft;
  const workbookPlanning = state.mode === 'workbook' && state.currentRound >= state.maxRounds;
  const complete = state.currentRound >= state.maxRounds && !workbookPlanning;
  const captain = isCaptain() || !state.roomCode;
  const locked = Boolean(state.decisionLocked);
  const s = previewSensitivity(state, state.sensitivity?.key || 'price', state.sensitivity?.deltaPct ?? 10);
  const readiness = draftReadiness(state);

  return `
    <div class="page-head">
      <div><div class="eyebrow">${workbookPlanning ? 'ROUND 6 — PLAN ONLY' : 'ROUND '+Math.min(state.currentRound + 1, state.maxRounds)}</div><h1>${workbookPlanning ? 'Round 6 Business Plan' : 'Business Decisions'}</h1><p class="subtitle">${workbookPlanning ? 'Workbook planning stage: isi delapan keputusan berdasarkan review R0–R5. Plan ini tidak akan disimulasikan.' : 'Semua anggota room dapat mengubah shared draft. Hanya Captain yang dapat lock dan submit ronde.'}</p></div>
      <button class="secondary" data-action="toggle-lock" ${!captain ? 'disabled' : ''}>▣ ${locked ? 'Unlock Draft' : 'Lock Draft'}</button>
    </div>
    ${locked ? `<div class="event"><span>▣</span><div><strong>Draft locked</strong><span class="event-copy">${esc(state.lockReason || 'Manual lock')}</span></div></div>` : ''}
    <section class="decision-layout">
      <div class="card">
        ${cardHead('MANAGEMENT INPUT', 'Shared Decision Form', '⌁')}
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
          <button class="primary" data-action="${workbookPlanning ? 'finalize-workbook-plan' : 'submit-round'}" ${complete || !captain || (locked && !workbookPlanning) || (workbookPlanning && state.workbookPlan) ? 'disabled' : ''}>▣ ${workbookPlanning ? (state.workbookPlan ? 'R6 PLAN FINALIZED' : 'Finalize R6 Business Plan') : complete ? 'GAME COMPLETE' : captain ? 'Lock & Submit Round' : 'Captain Submits Round'}</button>
          <button class="secondary" data-action="load-r1">Load R1 Reference</button>
        </div>
        ${state.roomCode && !captain ? '<div class="callout">Member mode: kamu bisa mengedit shared draft secara live, tetapi perubahan mode, lock, scenario, reset, dan submit tetap dikendalikan Captain.</div>' : ''}
      </div>

      <div class="side-stack">
        <div class="card readiness-card">
          ${cardHead('PRE-SUBMIT CHECK', 'Decision Readiness', '✓')}
          <div class="readiness-score"><strong>${readiness.score}</strong><span>/100</span><em>${readiness.score >= 80 ? 'READY' : readiness.score >= 60 ? 'REVIEW' : 'HIGH RISK'}</em></div>
          <div class="readiness-list">${readiness.checks.map(item=>`<div class="readiness-item ${item.severity}"><b>${item.severity === 'good' ? '✓' : item.severity === 'warning' ? '△' : '!'}</b><div><strong>${esc(item.title)}</strong><span>${esc(item.detail)}</span></div></div>`).join('')}</div>
        </div>
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
          <div class="callout">${workbookPlanning ? 'Directional check untuk membantu rationale R6. Tidak menghasilkan R6 simulated result.' : 'Directional training estimate, bukan forecast resmi TopBoss.'}</div>
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
  const latest = user.history?.at(-1) || {};
  return `<div class="page-head"><div><div class="eyebrow">MARKET + OPERATIONS</div><h1>Status</h1><p class="subtitle">Apa yang terjadi setelah keputusan dijalankan, termasuk timing operasi antar-round.</p></div></div>
    <section class="triple-grid">
      <div class="card">${cardHead('ECONOMY','Economic Environment')}${statsList([['Price Index',economy?fixed(economy.priceIndex,2):'100.00'],['Growth Indicator',economy?fixed(economy.growth*100,2):'100.00'],['Seasonal Indicator',economy?fixed(economy.seasonal*100,2):'100.00']])}</div>
      <div class="card">${cardHead('PRODUCT','Image & Quality')}${statsList([['Quality',fixed(user.quality,3)],['Image',fixed(user.image,3)],['Price',money(user.price)]])}</div>
      <div class="card">${cardHead('OPERATIONS','Business Status')}${statsList([['Potential Demand',num(user.potentialDemand)],['Sales',num(user.sales)],['Market Share',pct(user.marketShare)],['FG Inventory',num(user.finishedGoods)],['Next Capacity',num(user.capacity)],['End RM / Next Beginning',num(user.rawMaterial)]])}</div>
    </section>
    <section class="triple-grid">
      <div class="card">${cardHead('PRODUCTION LIMIT','Current Round Capacity','▦')}${statsList([['Beginning Capacity',num(latest.beginCapacity ?? user.capacity)],['Max w/ 50% Overtime',num(latest.maxProductionCapacity ?? user.capacity*1.5)],['Actual Production',num(user.production)]])}</div>
      <div class="card">${cardHead('PROCUREMENT TIMING','Raw Material Flow','↻')}${statsList([['Beginning RM',num(latest.beginRawMaterial ?? user.rawMaterial)],['Procurement Delivered End-Round',num(latest.procurementDelivered ?? 0)],['Ending RM',num(user.rawMaterial)]])}</div>
      <div class="card">${cardHead('EFFICIENCY','Maintenance Effect','◎')}${statsList([['Current Conversion Factor',fixed(latest.conversionFactor ?? user.conversionFactor,3)],['Next Conversion Factor',fixed(latest.nextConversionFactor ?? user.conversionFactor,3)],['Workbook Reference', '≈ 0.700']])}</div>
    </section>
    <div class="card">${cardHead('COMPETITIVE INTELLIGENCE','Sales Status','◎')}${competitionTable(state)}</div>`;
}

export function analysisView(state) {
  const user = state.companies.find(company => company.isUser);
  const latest = user.history?.at(-1) || {};
  return `<div class="page-head"><div><div class="eyebrow">DIAGNOSIS</div><h1>Analysis</h1><p class="subtitle">Bukan hanya apa yang terjadi, tetapi mengapa.</p></div></div>
    <section class="dashboard-grid">
      <div class="card">${cardHead('PRODUCTION & LOGISTICS','Supply Chain Diagnostic','▦')}${statsList([['Potential Demand',num(user.potentialDemand)],['Actual Sales',num(user.sales)],['Unserved Demand',num(Math.max(0,user.potentialDemand-user.sales))],['Production',num(user.production)],['Beginning Capacity',num(latest.beginCapacity ?? user.capacity)],['Overtime Ceiling',num(latest.maxProductionCapacity ?? user.capacity*1.5)],['RM Beginning',num(latest.beginRawMaterial ?? user.rawMaterial)],['RM Ending',num(user.rawMaterial)],['FG Inventory',num(user.finishedGoods)]])}</div>
      <div class="card">${cardHead('COST STRUCTURE','Unit Economics','$')}${statsList([['Price / Unit',money(user.price)],['Total Cost / Unit',money(user.unitCost)],['Spread / Unit',money(user.price-user.unitCost),user.price-user.unitCost>=0?'good':'bad'],['Profit Margin',pct(user.profitMargin)],['ROE',pct(user.roe)],['Current Ratio',fixed(user.currentRatio,2)+'x']])}${diagnosticText(user)}</div>
    </section>`;
}

function financialRows(rows) {
  return `<div class="fs-lines">${rows.map(row => {
    if (row.section) return `<div class="fs-section">${esc(row.section)}</div>`;
    const cls = [row.total ? 'fs-total' : '', row.subtotal ? 'fs-subtotal' : '', row.indent ? 'fs-indent' : '', row.tone || ''].filter(Boolean).join(' ');
    return `<div class="fs-line ${cls}"><span>${esc(row.label)}</span><strong>${row.value}</strong></div>`;
  }).join('')}</div>`;
}

function ratioValue(value, style = 'x') {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  if (style === 'pct') return pct(Number(value));
  return fixed(Number(value), 2) + 'x';
}

export function financialsView(state, selectedRound = null) {
  const rounds = availableFinancialRounds(state);
  const targetRound = rounds.includes(Number(selectedRound)) ? Number(selectedRound) : state.currentRound;
  const data = financialForRound(state, targetRound) || financialForRound(state, rounds.at(-1));
  if (!data) return '<div class="empty">Financial statement belum tersedia.</div>';

  const { statement: f, item, isDerived } = data;
  const bs = f.balanceSheet;
  const cf = f.cashFlow;
  const inc = f.incomeStatement;
  const reconciliationGap = Math.abs((bs.totalAssets || 0) - (bs.totalLiabilitiesAndEquity || 0));

  return `
    <div class="page-head">
      <div><div class="eyebrow">PERFORMANCE → FINANCIAL STATEMENT</div><h1>Financial Statement</h1><p class="subtitle">Final reconciliation page per round: Balance Sheet + Cash Flow + Income Statement.</p></div>
      <div class="actions">
        <label class="round-picker">Round
          <select id="financialRoundSelect">${rounds.map(round=>`<option value="${round}" ${round===data.round?'selected':''}>Round ${round}</option>`).join('')}</select>
        </label>
      </div>
    </div>

    <section class="financial-summary-strip">
      ${metric('Revenue', money(item.revenue), 'Financial result')}
      ${metric('Net Earnings', money(item.netProfit), 'Income Statement', item.netProfit>=0?'good':'bad')}
      ${metric('Cash', money(item.cash), item.overdraft?'Overdraft '+money(item.overdraft):'No overdraft', item.overdraft?'bad':'')}
      ${metric("Owners' Equity", money(item.equity), 'Balance Sheet')}
      ${metric('Current Ratio', fixed(item.currentRatio,2)+'x', 'Liquidity')}
      ${metric('Reconciliation', reconciliationGap < 1 ? 'BALANCED' : money(reconciliationGap), isDerived?'Legacy/derived detail':'Practice-model detail', reconciliationGap<1?'good':'warn')}
    </section>

    <div class="topboss-breadcrumb">Performance <span>›</span> Financial Statement <span>›</span> Round ${data.round}</div>

    <section class="financial-statement-grid">
      <article class="card financial-paper">
        ${cardHead('BALANCE SHEET','Balance Sheet','BS')}
        ${financialRows([
          {section:'ASSETS'},
          {label:'Cash',value:money(bs.cash),indent:true},
          {label:'Raw Material Inventory',value:money(bs.rawMaterialInventory),indent:true},
          {label:'Finished Goods Inventory',value:money(bs.finishedGoodsInventory),indent:true},
          {label:'Current Assets',value:money(bs.currentAssets),subtotal:true},
          {label:'Fixed & Other Assets',value:money(bs.fixedAndOtherAssets),indent:true},
          {label:'TOTAL ASSETS',value:money(bs.totalAssets),total:true},
          {section:'LIABILITIES & EQUITY'},
          {label:'Operating Liabilities',value:money(bs.operatingLiabilities),indent:true},
          {label:'Overdraft',value:money(bs.overdraft),indent:true,tone:bs.overdraft>0?'bad':''},
          {label:'Total Liabilities',value:money(bs.totalLiabilities),subtotal:true},
          {label:"Owners' Equity",value:money(bs.ownersEquity),subtotal:true},
          {label:'TOTAL LIABILITIES & EQUITY',value:money(bs.totalLiabilitiesAndEquity),total:true}
        ])}
      </article>

      <article class="card financial-paper">
        ${cardHead('CASH FLOW','Cash Flow','CF')}
        ${financialRows([
          {label:'Beginning Cash Balance',value:money(cf.beginningCash)},
          {label:'Revenue',value:money(cf.revenue),tone:'good'},
          {label:'Cash Expenditure',value:'('+money(cf.cashExpenditure)+')'},
          {label:'Operating Cash Flow',value:money(cf.operatingCashFlow),subtotal:true,tone:cf.operatingCashFlow>=0?'good':'bad'},
          {label:'Raw Material Purchase',value:'('+money(cf.rawMaterialPurchase)+')'},
          {label:'Equipment Investment',value:'('+money(cf.equipmentInvestment)+')'},
          {label:'Dividend',value:'('+money(cf.dividend)+')'},
          {label:'Cash Before Financing',value:money(cf.cashBeforeFinancing),subtotal:true,tone:cf.cashBeforeFinancing>=0?'good':'bad'},
          {label:'Overdraft Financing',value:money(cf.overdraft),tone:cf.overdraft>0?'bad':''},
          {label:'ENDING CASH BALANCE',value:money(cf.endingCash),total:true}
        ])}
      </article>

      <article class="card financial-paper">
        ${cardHead('INCOME STATEMENT','Income Statement','IS')}
        ${financialRows([
          {label:'Revenue',value:money(inc.revenue)},
          {label:'Cost of Goods Sold',value:'('+money(inc.costOfGoodsSold)+')'},
          {label:'Gross Profit',value:money(inc.grossProfit),subtotal:true,tone:inc.grossProfit>=0?'good':'bad'},
          {section:'OPERATING EXPENSES'},
          {label:'Marketing Expense',value:money(inc.marketingExpense),indent:true},
          {label:'R&D Expense',value:money(inc.rdExpense),indent:true},
          {label:'Maintenance Expense',value:money(inc.maintenanceExpense),indent:true},
          {label:'Management Expense',value:money(inc.managementExpense),indent:true},
          {label:'Warehouse Expense',value:money(inc.warehouseExpense),indent:true},
          {label:'Purchasing Expense',value:money(inc.purchasingExpense),indent:true},
          {label:'Depreciation',value:money(inc.depreciation),indent:true},
          {label:'Total Operating Expenses',value:money(inc.operatingExpenses),subtotal:true},
          {label:'Operating Profit',value:money(inc.operatingProfit),subtotal:true,tone:inc.operatingProfit>=0?'good':'bad'},
          {label:'Interest Expense',value:'('+money(inc.interestExpense)+')'},
          {label:'Earnings Before Tax',value:money(inc.earningsBeforeTax),subtotal:true},
          {label:'Tax',value:'('+money(inc.tax)+')'},
          {label:'NET EARNINGS',value:money(inc.netEarnings),total:true,tone:inc.netEarnings>=0?'good':'bad'}
        ])}
      </article>
    </section>

    <div class="callout financial-source-note">${isDerived
      ? 'Ronde lama belum menyimpan full line-item breakdown; detail di atas direkonstruksi dari history dan training-model accounting relationships.'
      : 'Line items direkonsiliasi dari engine ronde ini. Ini tetap practice-model financial statement, bukan proprietary TopBoss accounting engine.'}</div>
  `;
}

export function ratiosView(state, selectedRound = null) {
  const rounds = availableFinancialRounds(state);
  const targetRound = rounds.includes(Number(selectedRound)) ? Number(selectedRound) : state.currentRound;
  const data = financialForRound(state, targetRound) || financialForRound(state, rounds.at(-1));
  if (!data) return '<div class="empty">Financial ratios belum tersedia.</div>';
  const r = data.statement.ratios;
  return `
    <div class="page-head">
      <div><div class="eyebrow">ANALYSIS → FINANCIAL RATIO</div><h1>Financial Ratio</h1><p class="subtitle">Diagnostic ratios untuk membaca akibat gabungan seluruh keputusan, bukan decision input.</p></div>
      <div class="actions"><label class="round-picker">Round <select id="financialRoundSelect">${rounds.map(round=>`<option value="${round}" ${round===data.round?'selected':''}>Round ${round}</option>`).join('')}</select></label></div>
    </div>
    <div class="topboss-breadcrumb">Analysis <span>›</span> Financial Ratio <span>›</span> Round ${data.round}</div>
    <section class="ratio-grid">
      ${[
        ['Current Ratio',ratioValue(r.currentRatio)],
        ['Quick Ratio',ratioValue(r.quickRatio)],
        ['Inventory Turnover',ratioValue(r.inventoryTurnover)],
        ['Fixed Asset Turnover',ratioValue(r.fixedAssetTurnover)],
        ['Total Asset Turnover',ratioValue(r.totalAssetTurnover)],
        ['Debt Ratio',ratioValue(r.debtRatio,'pct')],
        ['Times Interest Earned',ratioValue(r.timesInterestEarned)],
        ['Net Profit Margin',ratioValue(r.netProfitMargin,'pct')],
        ['Basic Profit Margin',ratioValue(r.basicProfitMargin,'pct')],
        ['ROA',ratioValue(r.roa,'pct')],
        ['ROE',ratioValue(r.roe,'pct')],
        ['ROCE',ratioValue(r.roce,'pct')]
      ].map(([label,value])=>`<div class="ratio-card"><span>${label}</span><strong>${value}</strong></div>`).join('')}
    </section>
    <div class="callout">TopBoss-style diagnostic set: Current Ratio, Quick Ratio, Inventory Turnover, Fixed/Total Asset Turnover, Debt Ratio, Times Interest Earned, Net/Basic Profit Margin, ROA, ROE, dan ROCE.</div>
  `;
}

export function historyView(state) {
  const user = state.companies.find(company => company.isUser);
  return `<div class="page-head"><div><div class="eyebrow">ROUND DATABASE</div><h1>Decision History</h1><p class="subtitle">Decision dan result untuk ronde yang sama disimpan pada baris yang sama.</p></div></div>
    <div class="card table-card"><div class="table-wrap"><table><thead><tr><th>Round</th><th>Price</th><th>Marketing</th><th>R&D</th><th>Production</th><th>Sales</th><th>Revenue</th><th>Unit Cost</th><th>Net Profit</th><th>Δ Profit</th><th>NPV</th></tr></thead><tbody>${user.history.map((item,i)=>{const prev=user.history[i-1];const change=prev&&prev.netProfit?((item.netProfit-prev.netProfit)/Math.abs(prev.netProfit)):0;return `<tr><td>R${item.round}</td><td>${money(item.decision?.price||item.price)}</td><td>${money(item.decision?.marketing||0)}</td><td>${money(item.decision?.rd||0)}</td><td>${num(item.decision?.production||item.production)}</td><td>${num(item.sales)}</td><td>${money(item.revenue)}</td><td>${money(item.unitCost)}</td><td class="${item.netProfit>=0?'good':'bad'}">${money(item.netProfit)}</td><td class="${change>=0?'good':'bad'}">${i?pct(change):'—'}</td><td>${money(item.npv)}</td></tr>`}).join('')}</tbody></table></div></div>`;
}


function formatMatrixValue(key, value) {
  if (key === 'label') return value === undefined || value === null ? '—' : esc(String(value));
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—';
  if (key === 'share') return pct(Number(value));
  if (['price','unitCost'].includes(key)) return money(Number(value));
  if (['revenue','netProfit','cashExpenditure','cash','equity','marketing','rd','maintenance','equipment','dividend'].includes(key)) return money(Number(value));
  if (['image','quality','conversionFactor','nextConversionFactor'].includes(key)) return fixed(Number(value), 3);
  return num(Number(value));
}

export function matrixView(state) {
  const matrices = decisionMatrices(state);
  return `
    <div class="page-head">
      <div><div class="eyebrow">PDCA CONTROL SYSTEM</div><h1>Business Intelligence Decision Matrices</h1><p class="subtitle">Setiap matrix menghubungkan keputusan dengan outcome/KPI lintas ronde, sesuai struktur workbook.</p></div>
    </div>
    <div class="matrix-stack">
      ${matrices.map(matrix=>`
        <section class="card matrix-card">
          ${cardHead('DECISION MATRIX', matrix.title, '▥')}
          <p class="matrix-subtitle">${esc(matrix.subtitle)}</p>
          <div class="table-wrap"><table><thead><tr>${matrix.columns.map(([,label])=>`<th>${esc(label)}</th>`).join('')}</tr></thead>
          <tbody>${matrix.rows.map(row=>`<tr>${matrix.columns.map(([key])=>`<td class="${row.isPlan?'plan-cell':''}">${formatMatrixValue(key,row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        </section>`).join('')}
    </div>`;
}

export function leaderboardView(state) {
  const sorted = [...state.companies].sort((a,b)=>b.npv-a.npv);
  return `<div class="page-head"><div><div class="eyebrow">10-COMPANY MARKET</div><h1>Leaderboard</h1><p class="subtitle">Ranking menggunakan Practice NPV proxy yang transparan.</p></div></div>
    <div class="card table-card"><div class="table-wrap"><table><thead><tr><th>#</th><th>Company</th><th>Strategy</th><th>Practice NPV</th><th>Net Profit</th><th>Share</th><th>ROE</th><th>Score</th></tr></thead><tbody>${sorted.map((c,i)=>`<tr class="${c.isUser?'user-row':''}"><td class="${i===0?'rank1':''}">${i+1}</td><td>${esc(c.name)}</td><td>${esc(c.strategy)}</td><td>${money(c.npv)}</td><td class="${c.netProfit>=0?'good':'bad'}">${money(c.netProfit)}</td><td>${pct(c.marketShare)}</td><td>${pct(c.roe)}</td><td>${fixed(c.balancedScore,1)}</td></tr>`).join('')}</tbody></table></div></div>`;
}

export function scenariosView(state) {
  const captain = isCaptain() || !state.roomCode;
  const selectedPreset = state.mode === 'competition' ? 'auto' : (state.scenarioPreset || 'auto');
  return `<div class="page-head"><div><div class="eyebrow">SURPRISE ROUND</div><h1>Scenario Center</h1><p class="subtitle">Stress-test strategi dengan macro preset di Training/Sandbox. Competition selalu memakai Auto.</p></div></div>
    <section class="scenario-grid">
      <div class="card">
        ${cardHead('SETTINGS','Scenario Rules','⚙')}
        <div class="field"><label><span>Scenario Preset</span><span>${state.mode === 'competition' ? 'locked in Competition' : 'training control'}</span></label>
          <select id="scenarioPreset" ${!captain || state.mode === 'competition' ? 'disabled' : ''}>
            ${Object.entries(SCENARIO_PRESETS).map(([key,preset])=>`<option value="${key}" ${selectedPreset===key?'selected':''}>${esc(preset.label)}</option>`).join('')}
          </select>
        </div>
        <div class="scenario-description">${esc(SCENARIO_PRESETS[selectedPreset]?.description || '')}</div>
        <button class="scenario-toggle ${state.surpriseMode?'on':''}" data-action="toggle-surprise" ${!captain || selectedPreset !== 'auto' ? 'disabled' : ''}><strong>${state.surpriseMode?'ON':'OFF'}</strong><span>Random Surprise Events</span><small>Aktif hanya saat preset Auto. Mulai berpeluang muncul sejak Round 2.</small></button>
      </div>
      <div class="card">
        ${cardHead('EVENT HISTORY','What Changed','✦')}
        ${state.eventHistory?.length?state.eventHistory.map(e=>`<div class="event-item"><b>R${e.round}</b><div><strong>${esc(e.title)}</strong><span>${esc(e.text)}</span></div></div>`).join(''):'<div class="empty">Belum ada surprise event.</div>'}
      </div>
    </section>`;
}

export function modelView(state) {
  const calibration = calibrationReport(state);
  const calibrationLabel = !calibration.available ? 'Run R1 Reference' : calibration.comparable ? `${calibration.score}/100` : 'Not comparable';
  return `<div class="page-head"><div><div class="eyebrow">AUDITABILITY</div><h1>Model Transparency</h1><p class="subtitle">Pisahkan observed calibration anchors dari training-model approximations dan ukur fidelity saat input reference digunakan.</p></div></div>
    <section class="dashboard-grid">
      <div class="card">${cardHead('OBSERVED DATA','Calibration Anchors','◈')}<div class="anchor-grid">${OBSERVED_ANCHORS.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong><small>Observed calibration anchor</small></div>`).join('')}</div></div>
      <div class="card">${cardHead('CALIBRATION LAB','R1 Fidelity','◎')}
        <div class="calibration-score"><span>Calibration Score</span><strong>${calibrationLabel}</strong><small>${!calibration.available ? 'Load R1 Reference lalu submit Round 1.' : calibration.comparable ? 'Score = 100 − mean capped absolute % error.' : 'Round 1 decision berbeda dari observed R1 reference.'}</small></div>
        ${calibration.available ? `<div class="calibration-table"><div class="table-wrap"><table><thead><tr><th>Metric</th><th>Observed</th><th>Simulated</th><th>Error</th></tr></thead><tbody>${calibration.rows.map(row=>`<tr><td>${esc(row.label)}</td><td>${row.key==='marketShare'?pct(row.observed):num(row.observed)}</td><td>${row.key==='marketShare'?pct(row.simulated):num(row.simulated)}</td><td class="${row.errorPct===null?'':row.errorPct<15?'good':row.errorPct<35?'warn':'bad'}">${row.errorPct===null?'n/a':fixed(row.errorPct,1)+'%'}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
        <hr>
        ${TRAINING_PROXY_NOTES.map(x=>`<div class="proxy-note">${esc(x)}</div>`).join('')}
        <div class="callout">Calibration Lab mengevaluasi output model terhadap anchor yang kita punya; ini bukan bukti formula proprietary berhasil direplikasi.</div>
      </div>
    </section>`;
}

export function setupView(state) {
  const config = getSupabaseConfig();
  const session = getRoomSession();
  const captain = isCaptain() || !state.roomCode;

  return `
    <div class="page-head"><div><div class="eyebrow">TEAM WORKSPACE</div><h1>Room & Setup</h1><p class="subtitle">v0.3 menambahkan member presence, Captain authority, atomic shared draft, dan revision-safe room state.</p></div></div>
    <div class="setup-grid">
      <div class="card">
        ${cardHead('CURRENT GAME','Game & Recovery','⚙')}
        <div class="field"><label><span>Team Name</span><span>identity</span></label><input id="setupTeam" value="${esc(state.teamName)}" ${!captain ? 'disabled' : ''}></div>
        <div class="actions" style="margin-top:16px">
          <button class="secondary" data-action="rename-team" ${!captain ? 'disabled' : ''}>Save Team Name</button>
          <button class="danger" data-action="reset-game" ${!captain ? 'disabled' : ''}>Reset Game</button>
          <button class="secondary" data-action="export-save">⇩ Export JSON</button>
          <button class="secondary" data-action="import-save">⇧ Import JSON</button>
          <input id="importFile" type="file" accept=".json,application/json" hidden>
        </div>
        ${state.roomCode ? `
          <hr>
          <div class="room-meta-grid">
            <div><span>ROOM CODE</span><strong>${esc(state.roomCode)}</strong></div>
            <div><span>REVISION</span><strong>#${num(state.revision || 0)}</strong></div>
            <div><span>YOUR ROLE</span><strong>${esc(session.role || 'room')}</strong></div>
          </div>
          <div class="small room-key-label">ROOM KEY</div><div class="code-box">${esc(state.roomKey)}</div>
          <div class="actions" style="margin-top:12px"><button class="secondary" data-action="leave-room">Leave Room</button></div>
        ` : ''}
      </div>

      <div class="card">
        ${cardHead('SHARED ROOM','Supabase Connection','◎')}
        <div class="field"><label><span>Supabase Project URL</span><span>public</span></label><input id="supabaseUrl" placeholder="https://xxxxx.supabase.co" value="${esc(config.url||'')}"></div>
        <div class="field spaced"><label><span>Supabase Anon / Publishable Key</span><span>public key</span></label><input id="supabaseKey" type="password" placeholder="Public anon key" value="${esc(config.key||'')}"></div>

        ${!state.roomCode ? `
          <hr>
          <div class="field"><label><span>Your Display Name</span><span>captain</span></label><input id="memberName" placeholder="Mahen"></div>
          <div class="actions" style="margin-top:16px"><button class="primary" data-action="create-room">Create Online Room</button></div>
          <hr>
          <div class="card-head"><div><span>JOIN</span><h2>Existing Room</h2></div></div>
          <div class="field"><label><span>Your Display Name</span><span>member</span></label><input id="joinName" placeholder="Team member"></div>
          <div class="field spaced"><label><span>Room Code</span><span>e.g. MBS-4821</span></label><input id="joinCode" placeholder="MBS-4821"></div>
          <div class="field spaced"><label><span>Room Key</span><span>8 chars</span></label><input id="joinKey" placeholder="XXXXXXXX"></div>
          <div class="actions" style="margin-top:16px"><button class="secondary" data-action="join-room">Join Room</button></div>
        ` : `
          <hr>
          ${cardHead('TEAM PRESENCE','Room Members','◉')}
          ${roomPresence(state)}
        `}

        <div class="callout">Untuk fitur v0.3 penuh, jalankan schema SQL terbaru sekali di Supabase. Jika belum, aplikasi tetap mencoba legacy room mode.</div>
      </div>
    </div>`;
}

export function bodyForTab(state, activeTab, ui = {}) {
  switch (activeTab) {
    case 'competition': return competitionView(state);
    case 'workbook': return workbookView(state);
    case 'strategy': return strategyView(state);
    case 'optimizer': return optimizerView(state);
    case 'decisions': return decisionsView(state);
    case 'status': return statusView(state);
    case 'analysis': return analysisView(state);
    case 'ratios': return ratiosView(state, ui.financialRound);
    case 'financials': return financialsView(state, ui.financialRound);
    case 'history': return historyView(state);
    case 'matrix': return matrixView(state);
    case 'leaderboard': return leaderboardView(state);
    case 'scenarios': return scenariosView(state);
    case 'model': return modelView(state);
    case 'setup': return setupView(state);
    default: return dashboardView(state);
  }
}
