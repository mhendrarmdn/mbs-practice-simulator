import { EVIDENCE_LEVELS, MODEL_BOUNDARIES, OFFICIAL_RULES, evidenceSummary } from './sourceRegistry.js';
import { esc } from './utils.js';

function badge(status){
  const meta=EVIDENCE_LEVELS[status] || EVIDENCE_LEVELS.unknown;
  return `<span class="evidence-badge ${esc(meta.tone)}">${esc(meta.label)}</span>`;
}

function ruleRows(rows){
  return rows.map(row => `
    <article class="official-rule-card">
      <div class="official-rule-head"><h3>${esc(row.title)}</h3>${badge(row.status)}</div>
      <p>${esc(row.detail || row.action || '')}</p>
      ${row.source ? `<small>${esc(row.source)}</small>` : ''}
    </article>`).join('');
}

function boundaryRows(){
  return MODEL_BOUNDARIES.map(row => `
    <tr>
      <td><strong>${esc(row.title)}</strong></td>
      <td>${badge(row.status)}</td>
      <td>${esc(row.action)}</td>
    </tr>`).join('');
}

export function officialTwinView(state){
  const summary=evidenceSummary();
  return `
    <div class="page-head official-twin-head">
      <div>
        <div class="eyebrow">SOURCE-OF-TRUTH WORKSPACE</div>
        <h1>Official Twin</h1>
        <p class="subtitle">Use this layer to mirror the supplied TopBoss workflow while keeping verified mechanics separate from calibrated practice estimates.</p>
      </div>
      <div class="actions official-twin-actions">
        <button class="primary" data-tab="officialSync">Open Official Sync</button>
        <button class="secondary" data-tab="strategy">Open Strategy Lab</button>
      </div>
    </div>

    <div class="official-trust-banner">
      <strong>Competition safety rule</strong>
      <span>Never enter a practice estimate into TopBoss as though it were an official formula. After every official round, capture the result, reconcile prediction vs actual, then recalibrate.</span>
    </div>

    <div class="official-summary-grid">
      <div><span>Confirmed mechanics</span><strong>${summary.confirmed}</strong><small>documented / observed</small></div>
      <div><span>Unknown formulas</span><strong>${summary.unknown}</strong><small>must stay non-official</small></div>
      <div><span>Current round</span><strong>R${Number(state.currentRound||0)}</strong><small>${esc(state.mode || 'training')} mode</small></div>
      <div><span>Official data capture</span><strong>${Object.keys(state.official?.actuals || {}).length}</strong><small>round(s) saved</small></div>
    </div>

    <div class="official-grid two">
      <section class="card">
        <div class="card-head"><div><span>VERIFIED MECHANICS</span><h2>Rules we can rely on</h2></div></div>
        <div class="official-rule-list">${ruleRows(OFFICIAL_RULES)}</div>
      </section>
      <section class="card">
        <div class="card-head"><div><span>ROUND LOOP</span><h2>Competition decision workflow</h2></div></div>
        <ol class="official-loop">
          <li><b>Capture</b><span>Record official environment, status, analysis and financial outputs.</span></li>
          <li><b>Reconcile</b><span>Compare practice prediction against official actual results.</span></li>
          <li><b>Diagnose</b><span>Find whether error came from demand, cost, capacity, inventory or competitor response.</span></li>
          <li><b>Calibrate</b><span>Update only bounded parameters supported by evidence.</span></li>
          <li><b>Stress test</b><span>Run base / downside / upside candidates in Strategy Lab.</span></li>
          <li><b>Decide</b><span>Lock the eight decisions with liquidity, capacity and next-round readiness checks.</span></li>
        </ol>
        <div class="official-eight">
          <span>Price</span><span>Production</span><span>Procurement</span><span>Marketing</span>
          <span>R&amp;D</span><span>Maintenance</span><span>Equipment</span><span>Dividend</span>
        </div>
      </section>
    </div>

    <section class="card official-boundary-card">
      <div class="card-head"><div><span>MODEL BOUNDARY</span><h2>Do not treat these as exact TopBoss formulas</h2></div></div>
      <div class="table-wrap"><table><thead><tr><th>Mechanic</th><th>Status</th><th>How v2.0 handles it</th></tr></thead><tbody>${boundaryRows()}</tbody></table></div>
    </section>

    <section class="card">
      <div class="card-head"><div><span>SOURCE HIERARCHY</span><h2>When sources disagree</h2></div></div>
      <div class="official-source-stack">
        <div><b>1</b><span><strong>Captured TopBoss interface / HAR</strong><small>UI structure, page names, routes, observed official outputs.</small></span></div>
        <div><b>2</b><span><strong>Student Workbook</strong><small>Documented operating mechanics and decision relationships.</small></span></div>
        <div><b>3</b><span><strong>2026 Competition Booklet</strong><small>Competition objective, rounds, advancement and presentation format.</small></span></div>
        <div><b>4</b><span><strong>Strategy Lab engine</strong><small>Transparent estimates only; useful for scenarios, never authoritative over official results.</small></span></div>
      </div>
    </section>`;
}
