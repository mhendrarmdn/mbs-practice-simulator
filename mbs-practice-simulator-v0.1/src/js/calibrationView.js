import { adaptiveCalibrationProfile, calibrationFactorRows, calibrationRoundRows } from './calibrationEngine.js';
import { isCaptain } from './supabase.js';
import { esc } from './utils.js';

function pct(value,digits=1) {
  return Number.isFinite(Number(value)) ? `${(Number(value)*100).toFixed(digits)}%` : '—';
}
function pp(value) {
  return Number.isFinite(Number(value)) ? `${Number(value)>=0?'+':''}${(Number(value)*100).toFixed(2)}pp` : '—';
}
function factorValue(row) {
  if (row.format==='shift') return `${Number(row.value)>=0?'+':''}${Number(row.value).toFixed(3)}`;
  return `${Number(row.value).toFixed(3)}×`;
}
function tone(value, neutral=1, tolerance=.03) {
  if (!Number.isFinite(Number(value))) return '';
  return Math.abs(Number(value)-neutral)<=tolerance ? 'neutral' : Number(value)>neutral ? 'warn' : 'good';
}

export function calibrationLabView(state) {
  const profile=adaptiveCalibrationProfile(state);
  const factors=calibrationFactorRows(state);
  const rounds=calibrationRoundRows(state);
  const captain=!state.roomCode || isCaptain();
  const status=profile.active ? 'ACTIVE' : profile.samples ? 'PAUSED' : 'WAITING FOR DATA';

  return `
    <div class="page-head">
      <div>
        <div class="eyebrow">MODEL LEARNING CONTROL</div>
        <h1>Calibration Lab</h1>
        <p class="subtitle">Belajar dari selisih prediction vs official TopBoss actual tanpa menganggap practice model sebagai formula resmi.</p>
      </div>
      <div class="actions">
        <button class="${profile.active?'secondary':'primary'}" data-action="toggle-adaptive-calibration" ${!captain?'disabled':''}>${profile.active?'Pause Adaptive Calibration':'Enable Adaptive Calibration'}</button>
      </div>
    </div>

    <section class="calibration-hero">
      <div class="calibration-score"><span>ADAPTIVE CALIBRATION</span><strong>${status}</strong><small>${profile.samples} official round${profile.samples===1?'':'s'} paired</small></div>
      <div class="calibration-score"><span>MODEL CONFIDENCE</span><strong>${profile.confidence}%</strong><small>Uncertainty band ±${profile.uncertaintyPct}%</small></div>
      <div class="calibration-score"><span>MEAN ABS ERROR</span><strong>${Number(profile.meanAbsErrorPct||0).toFixed(1)}%</strong><small>Across matched official metrics</small></div>
      <div class="calibration-score"><span>SHRINKAGE WEIGHT</span><strong>${Math.round(Number(profile.weight||0)*100)}%</strong><small>Koreksi diredam saat sample kecil</small></div>
    </section>

    <div class="callout ${profile.samples<2?'warn':''}">
      <strong>${esc(profile.recommendation)}</strong>
      <span> Adaptive calibration hanya mengubah practice forecast. TopBoss tetap source of truth dan hasil final tetap harus diverifikasi di Official Sync.</span>
    </div>

    <section class="dashboard-grid calibration-grid">
      <div class="card">
        <div class="card-head"><div><span>LIVE CORRECTION</span><h2>Calibration Factors</h2></div></div>
        <div class="calibration-factor-list">
          ${factors.map(row=>`
            <div class="calibration-factor">
              <div><strong>${esc(row.label)}</strong><small>${esc(row.meaning)}</small></div>
              <span class="${row.format==='factor'?tone(row.value):tone(row.value,0,.01)}">${factorValue(row)}</span>
            </div>`).join('')}
        </div>
        <div class="tb-note">Factors menggunakan median error dan shrinkage konservatif. Batas correction sengaja dibatasi agar satu ronde anomali tidak mengubah engine secara ekstrem.</div>
      </div>

      <div class="card">
        <div class="card-head"><div><span>HOW IT AFFECTS FORECAST</span><h2>Calibration Pipeline</h2></div></div>
        <div class="calibration-pipeline">
          <div><b>1</b><span>Official actual disimpan</span></div>
          <div><b>2</b><span>Prediction sebelum overwrite dipertahankan</span></div>
          <div><b>3</b><span>Error per metric dihitung</span></div>
          <div><b>4</b><span>Robust median + shrinkage menghasilkan correction</span></div>
          <div><b>5</b><span>Next simulation + optimizer memakai calibration yang sama</span></div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><div><span>OUT-OF-SAMPLE TRACKING</span><h2>Official Round Error History</h2></div></div>
      ${rounds.length ? `
        <div class="tb-table-wrap"><table class="tb-table calibration-table">
          <thead><tr><th>Round</th><th>Revenue Error</th><th>Profit Error</th><th>Sales Error</th><th>Share Error</th><th>Unit Cost Error</th></tr></thead>
          <tbody>${rounds.map(row=>`
            <tr>
              <td><strong>R${row.round}</strong></td>
              <td>${pct(row.revenueError)}</td>
              <td>${pct(row.profitError)}</td>
              <td>${pct(row.salesError)}</td>
              <td>${pp(row.shareError)}</td>
              <td>${pct(row.costError)}</td>
            </tr>`).join('')}</tbody>
        </table></div>` :
        '<div class="empty">Belum ada pasangan prediction + official actual. Simulasikan ronde, lalu simpan hasil resmi TopBoss melalui Official Sync.</div>'}
    </section>

    <section class="card calibration-safety">
      <div class="card-head"><div><span>COMPETITION GUARDRAIL</span><h2>When to Trust It</h2></div></div>
      <div class="brief-list">
        <div><b>•</b><span><strong>1 round:</strong> directional only; correction hanya sekitar sepertiga dari observed error.</span></div>
        <div><b>•</b><span><strong>2 rounds:</strong> boleh menjadi secondary forecast, tetap stress-test.</span></div>
        <div><b>•</b><span><strong>3+ rounds:</strong> lebih berguna untuk ranking decision alternatives, selama environment resmi sudah sinkron.</span></div>
        <div><b>•</b><span><strong>Structural break:</strong> jika TopBoss mengubah kondisi besar, prioritaskan Official Environment dan jangan mengandalkan historical correction sendirian.</span></div>
      </div>
    </section>
  `;
}
