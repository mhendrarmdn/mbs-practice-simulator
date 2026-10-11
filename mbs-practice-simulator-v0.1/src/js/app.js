import '../css/app.css';
import '../css/topboss-v12.css';
import { MAX_ROUNDS, OPTIMIZER_RISK_PROFILES, ROUND1_REFERENCE, ROLE_KEY, SCENARIO_PRESETS, STRATEGY_GOALS, WORKBOOK_RESULT_ROUNDS } from './config.js';
import { makeInitialState, loadState, migrateState, saveLocal, userCompany } from './state.js';
import { simulateRound } from './simulator.js';
import {
  clearRoomSession,
  commitRoom,
  createRoom,
  getCaptainRecovery,
  getRoom,
  getRoomSession,
  isCaptain,
  joinRoom,
  provisionCaptainRecovery,
  removeRoomMember,
  resumeCaptain,
  patchDraft,
  randomRoomCode,
  randomRoomKey,
  saveSupabaseConfig
} from './supabase.js';
import { bodyForTab, shell } from './views.js';
import { deepClone } from './utils.js';
import { exportGame, importGame } from './persistence.js';
import { getThemePreference, initTheme, setThemePreference } from './theme.js';
import { buildCompetitionBriefMarkdown } from './competitionCenter.js';
import { buildRound6Review, buildWorkbookPlanMarkdown } from './workbookLab.js';
import { exportWorkbookExcel } from './excelExporter.js';
import { buildOptimizerMarkdown, robustOptimize } from './robustOptimizer.js';

const root = document.querySelector('#app');
let state = loadState();
let activeTab = 'dashboard';
const SIDEBAR_KEY = 'mbs_sidebar_collapsed_desktop_v101';
const mobileSidebarQuery = window.matchMedia('(max-width: 900px)');
const storedSidebar = localStorage.getItem(SIDEBAR_KEY);
let sidebarCollapsed = mobileSidebarQuery.matches
  ? true
  : storedSidebar === '1';
let financialRound = null;
let parityRound = null;
let competitiveMetric = 'marketShare';
let pollTimer = null;
let timerTick = null;
const draftTimers = new Map();
let remoteBusy = false;
initTheme();

function markSync(text) {
  const badge = document.querySelector('#syncBadge');
  if (badge) badge.textContent = text;
}

function persistLocal({ touch = true } = {}) {
  saveLocal(state, { touch });
  markSync(state.roomCode ? '● Local cache' : '● Saved');
}

function applyRoomPayload(payload, roomCode = state.roomCode, roomKey = state.roomKey) {
  const remoteState = payload?.state || payload;
  if (!remoteState?.companies) return false;

  const next = migrateState(remoteState);
  next.roomCode = roomCode || next.roomCode || '';
  next.roomKey = roomKey || next.roomKey || '';
  next.revision = Number(payload?.revision ?? remoteState?.revision ?? next.revision ?? 0);
  next.roomMembers = Array.isArray(payload?.members) ? payload.members : (next.roomMembers || []);
  state = next;
  saveLocal(state, { touch: false });
  return true;
}

async function refreshRoom({ rerender = true } = {}) {
  if (!state.roomCode || !state.roomKey || remoteBusy) return null;
  try {
    remoteBusy = true;
    const payload = await getRoom(state.roomCode, state.roomKey);
    const remoteRevision = Number(payload?.revision ?? payload?.state?.revision ?? 0);
    const shouldApply =
      remoteRevision > Number(state.revision || 0) ||
      Array.isArray(payload?.members);

    if (shouldApply && applyRoomPayload(payload)) {
      if (rerender) render(false);
    }
    markSync('● Online');
    return payload;
  } catch (error) {
    const message = String(error?.message || error);
    console.warn('Remote sync failed:', error);

    if (message.includes('Invalid room member session')) {
      clearInterval(pollTimer);
      state.roomCode = '';
      state.roomKey = '';
      state.roomMembers = [];
      state.revision = 0;
      clearRoomSession();
      persistLocal();
      activeTab = 'setup';
      alert('Kamu telah dikeluarkan dari room oleh Captain.');
      if (rerender) render(false);
      return null;
    }

    markSync('● Offline cache');
    return null;
  } finally {
    remoteBusy = false;
  }
}

async function commitCanonicalState() {
  if (!state.roomCode || !state.roomKey) {
    persistLocal();
    return true;
  }
  if (!isCaptain()) return false;

  try {
    markSync('● Syncing');
    const payload = await commitRoom(state);
    applyRoomPayload(payload);
    markSync('● Online');
    return true;
  } catch (error) {
    const message = String(error?.message || error);
    if (message.includes('REVISION_CONFLICT')) {
      await refreshRoom({ rerender: false });
      alert('Ada perubahan terbaru dari anggota tim. Draft sudah disinkronkan; periksa kembali sebelum submit.');
      render();
      return false;
    }
    console.warn('Remote commit failed:', error);
    markSync('● Offline cache');
    alert(message);
    return false;
  }
}

function queueDraftPatch(field, value) {
  persistLocal();
  if (!state.roomCode || !state.roomKey) return;

  clearTimeout(draftTimers.get(field));
  draftTimers.set(field, setTimeout(async () => {
    try {
      markSync('● Syncing');
      const payload = await patchDraft(state, field, value);
      if (payload?.state) applyRoomPayload(payload);
      markSync('● Online');
    } catch (error) {
      console.warn('Draft patch failed:', error);
      markSync('● Offline cache');
    }
  }, 250));
}

function startPolling() {
  clearInterval(pollTimer);
  if (state.roomCode && state.roomKey) {
    pollTimer = setInterval(() => refreshRoom({ rerender: true }), 2500);
  }
}

function ensureCompetitionDeadline() {
  if (state.mode !== 'competition' || state.currentRound >= state.maxRounds) return;
  if (!state.roundDeadlineAt && (!state.roomCode || isCaptain())) {
    state.roundDeadlineAt = new Date(Date.now() + state.timerSeconds * 1000).toISOString();
    state.timerRemaining = state.timerSeconds;
    persistLocal();
    if (state.roomCode) commitCanonicalState();
  }
}

function timerRemaining() {
  if (state.mode !== 'competition') return state.timerSeconds;
  if (!state.roundDeadlineAt) return Number(state.timerRemaining || state.timerSeconds);
  return Math.max(0, Math.ceil((new Date(state.roundDeadlineAt).getTime() - Date.now()) / 1000));
}

function startTimer() {
  clearInterval(timerTick);
  ensureCompetitionDeadline();
  if (state.mode !== 'competition' || state.currentRound >= state.maxRounds) return;

  timerTick = setInterval(async () => {
    const remaining = timerRemaining();
    state.timerRemaining = remaining;

    if (remaining <= 0 && !state.decisionLocked) {
      if (!state.roomCode || isCaptain()) {
        state.decisionLocked = true;
        state.lockReason = 'Competition timer expired';
        state.roundDeadlineAt = null;
        persistLocal();
        if (state.roomCode) await commitCanonicalState();
      }
      clearInterval(timerTick);
    } else {
      saveLocal(state, { touch: false });
    }
    render(false);
  }, 1000);
}

function render(restartTimer = true) {
  state.timerRemaining = timerRemaining();
  const navScrollTop = root.querySelector('.nav')?.scrollTop ?? 0;
  const sidebarScrollTop = root.querySelector('.sidebar')?.scrollTop ?? 0;

  root.innerHTML = shell(state, activeTab, getThemePreference(), { sidebarCollapsed });
  try {
    document.querySelector('#content').innerHTML = bodyForTab(state, activeTab, { financialRound, parityRound, competitiveMetric });
  } catch (error) {
    console.error('View render failed:', activeTab, error);
    const message = String(error?.message || error || 'Unknown render error');
    const safeMessage = message.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    document.querySelector('#content').innerHTML = '<div class="page-head"><div><div class="eyebrow">RECOVERY MODE</div><h1>Page could not be rendered</h1><p class="subtitle">The rest of the simulator is still available. This page failed safely instead of breaking navigation.</p></div></div><div class="card"><div class="card-head"><div><span>RUNTIME ERROR</span><h2>' + activeTab + '</h2></div></div><div class="callout warn">' + safeMessage + '</div><div class="callout">Try another menu or refresh. If this persists, the error text above identifies the failing analysis module.</div></div>';
  }

  const nav = root.querySelector('.nav');
  const sidebar = root.querySelector('.sidebar');
  if (nav) nav.scrollTop = navScrollTop;
  if (sidebar) sidebar.scrollTop = sidebarScrollTop;
  root.querySelector('.nav button.active')?.scrollIntoView({ block: 'nearest' });

  bindEvents();
  if (restartTimer) startTimer();
}

function captainOnly(actionName = 'Aksi ini') {
  if (state.roomCode && !isCaptain()) {
    alert(`${actionName} hanya dapat dilakukan Captain.`);
    return false;
  }
  return true;
}

async function updateCaptainSetting(mutator) {
  if (!captainOnly()) return false;
  mutator();
  persistLocal();
  if (state.roomCode) return commitCanonicalState();
  return true;
}


function exportCompetitionBrief() {
  const markdown = buildCompetitionBriefMarkdown(state);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mbs-competition-brief-${String(state.teamName || 'team').toLowerCase()}-r${state.currentRound}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportWorkbookPlan() {
  const markdown = buildWorkbookPlanMarkdown(state);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mbs-workbook-r6-plan-${String(state.teamName || 'team').toLowerCase()}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportOptimizerBrief() {
  const markdown = buildOptimizerMarkdown(state, state.optimizerRisk || 'balanced');
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mbs-optimizer-${String(state.teamName || 'team').toLowerCase()}-r${state.currentRound}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab;
      parityRound = null;
      if (mobileSidebarQuery.matches) {
        sidebarCollapsed = true;
      }
      render();
    });
  });

  document.querySelector('#themeSelect')?.addEventListener('change', event => {
    setThemePreference(event.target.value);
    render(false);
  });

  document.querySelector('#financialRoundSelect')?.addEventListener('change', event => {
    financialRound = Number(event.target.value);
    render(false);
  });

  document.querySelectorAll('[data-round-tab]').forEach(button => {
    button.addEventListener('click', () => {
      parityRound = Number(button.dataset.roundTab);
      render(false);
    });
  });

  document.querySelector('#competitiveMetric')?.addEventListener('change', event => {
    competitiveMetric = event.target.value || 'marketShare';
    render(false);
  });

  document.querySelectorAll('[data-competitive-metric]').forEach(button => {
    button.addEventListener('click', () => {
      competitiveMetric = button.dataset.competitiveMetric || 'marketShare';
      render(false);
    });
  });

  const setCompetitiveHover = (key, on) => {
    if (!key) return;
    document.querySelectorAll(`[data-company-key="${CSS.escape(key)}"]`).forEach(el => {
      el.classList.toggle('is-hovered', on);
    });
  };

  document.querySelectorAll('[data-company-key]').forEach(el => {
    el.addEventListener('mouseenter', () => setCompetitiveHover(el.dataset.companyKey, true));
    el.addEventListener('mouseleave', () => setCompetitiveHover(el.dataset.companyKey, false));
  });

  document.querySelectorAll('[data-competitor-toggle]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const key = button.dataset.companyKey;
      const series = document.querySelector(`.competitive-series[data-company-key="${CSS.escape(key)}"]`);
      if (!series) return;
      series.classList.toggle('is-hidden');
      button.classList.toggle('is-hidden');
    });
  });

  document.querySelector('#modeSelect')?.addEventListener('change', async event => {
    if (!captainOnly('Perubahan mode')) {
      event.target.value = state.mode;
      return;
    }
    state.mode = event.target.value;
    state.maxRounds = state.mode === 'workbook' ? WORKBOOK_RESULT_ROUNDS : MAX_ROUNDS;
    if (state.mode === 'competition') state.scenarioPreset = 'auto';
    state.decisionLocked = false;
    state.lockReason = '';
    state.timerRemaining = state.timerSeconds;
    state.roundDeadlineAt = state.mode === 'competition'
      ? new Date(Date.now() + state.timerSeconds * 1000).toISOString()
      : null;
    persistLocal();
    if (state.roomCode) await commitCanonicalState();
    render();
  });

  document.querySelectorAll('[data-decision]').forEach(input => {
    const parseDecisionValue = () => Number(String(input.value).replace(/,/g, '').trim()) || 0;
    input.addEventListener('focus', () => {
      if (state.decisionLocked) return;
      input.value = String(parseDecisionValue());
      if (input.dataset.decision === 'price') input.value = Number(input.value).toFixed(2);
      input.select?.();
    });
    input.addEventListener('input', () => {
      if (state.decisionLocked) return;
      const field = input.dataset.decision;
      const value = parseDecisionValue();
      state.draft[field] = value;
      queueDraftPatch(field, value);
    });
    input.addEventListener('blur', () => {
      const field = input.dataset.decision;
      const value = Number(state.draft[field] || 0);
      input.value = field === 'price'
        ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : Math.round(value).toLocaleString('en-US');
    });
  });

  document.querySelector('#sensitivityKey')?.addEventListener('change', event => {
    state.sensitivity = state.sensitivity || {};
    state.sensitivity.key = event.target.value;
    persistLocal();
    render(false);
  });

  document.querySelector('#sensitivityPct')?.addEventListener('input', event => {
    state.sensitivity = state.sensitivity || {};
    state.sensitivity.deltaPct = Number(event.target.value);
    persistLocal();
    render(false);
  });

  document.querySelector('#strategyGoal')?.addEventListener('change', async event => {
    if (!captainOnly('Strategy goal')) {
      event.target.value = state.strategyGoal || 'balancedValue';
      return;
    }
    const key = event.target.value;
    if (!STRATEGY_GOALS[key]) return;
    state.strategyGoal = key;
    persistLocal();
    if (state.roomCode) await commitCanonicalState();
    render();
  });

  document.querySelector('#optimizerRisk')?.addEventListener('change', async event => {
    if (!captainOnly('Optimizer risk profile')) {
      event.target.value = state.optimizerRisk || 'balanced';
      return;
    }
    const key = event.target.value;
    if (!OPTIMIZER_RISK_PROFILES[key]) return;
    state.optimizerRisk = key;
    persistLocal();
    if (state.roomCode) await commitCanonicalState();
    render();
  });

  document.querySelector('#scenarioPreset')?.addEventListener('change', async event => {
    if (!captainOnly('Scenario preset')) {
      event.target.value = state.scenarioPreset || 'auto';
      return;
    }
    const key = event.target.value;
    if (!SCENARIO_PRESETS[key]) return;
    state.scenarioPreset = key;
    persistLocal();
    if (state.roomCode) await commitCanonicalState();
    render();
  });

  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', async () => {
    const action = button.dataset.action;
    try {
      if (action === 'toggle-sidebar') {
        sidebarCollapsed = !sidebarCollapsed;
        if (!mobileSidebarQuery.matches) {
          localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? '1' : '0');
        }
        render(false);
        return;

      } else if (action === 'goto-decisions') {
        activeTab = 'decisions';

      } else if (action === 'load-r1') {
        state.draft = deepClone(ROUND1_REFERENCE);
        persistLocal();
        if (state.roomCode) {
          for (const [field, value] of Object.entries(state.draft)) {
            await patchDraft(state, field, value);
          }
          await refreshRoom({ rerender: false });
        }

      } else if (action === 'toggle-lock') {
        if (!captainOnly('Lock / unlock draft')) return;
        state.decisionLocked = !state.decisionLocked;
        state.lockReason = state.decisionLocked ? 'Manual lock by Captain' : '';
        if (!state.decisionLocked && state.mode === 'competition' && !state.roundDeadlineAt) {
          state.roundDeadlineAt = new Date(Date.now() + state.timerSeconds * 1000).toISOString();
        }
        persistLocal();
        if (state.roomCode) await commitCanonicalState();

      } else if (action === 'submit-round') {
        if (!captainOnly('Submit round')) return;
        if (state.decisionLocked || state.currentRound >= state.maxRounds) return;

        if (state.roomCode) {
          const latest = await getRoom(state.roomCode, state.roomKey);
          applyRoomPayload(latest);
        }
        simulateRound(state);
        financialRound = state.currentRound;
        parityRound = state.currentRound;
        state.roundDeadlineAt = state.mode === 'competition' && state.currentRound < state.maxRounds
          ? new Date(Date.now() + state.timerSeconds * 1000).toISOString()
          : null;
        persistLocal();

        const committed = state.roomCode ? await commitCanonicalState() : true;
        if (committed) activeTab = state.mode === 'workbook' && state.currentRound >= WORKBOOK_RESULT_ROUNDS ? 'workbook' : 'dashboard';

      } else if (action === 'finalize-workbook-plan') {
        if (!captainOnly('Finalize Round 6 plan')) return;
        if (state.mode !== 'workbook' || state.currentRound < WORKBOOK_RESULT_ROUNDS) return;
        const review = buildRound6Review(state);
        state.workbookPlan = {
          decision: deepClone(state.draft),
          observations: review.observations,
          rationale: review.rationale,
          finalizedAt: new Date().toISOString()
        };
        state.decisionLocked = true;
        state.lockReason = 'Workbook Round 6 plan finalized — planning only, no simulation';
        persistLocal();
        if (state.roomCode) await commitCanonicalState();
        activeTab = 'workbook';

      } else if (action === 'reopen-workbook-plan') {
        if (!captainOnly('Reopen Round 6 plan')) return;
        state.workbookPlan = null;
        state.decisionLocked = false;
        state.lockReason = '';
        persistLocal();
        if (state.roomCode) await commitCanonicalState();
        activeTab = 'decisions';

      } else if (action === 'export-workbook-plan') {
        exportWorkbookPlan();

      } else if (action === 'export-workbook-excel') {
        exportWorkbookExcel(state);

      } else if (action === 'apply-optimizer-draft') {
        if (!captainOnly('Apply optimizer draft')) return;
        if (state.decisionLocked) {
          alert('Draft sedang locked. Unlock dulu sebelum menerapkan rekomendasi optimizer.');
          return;
        }
        const result = robustOptimize(state, state.optimizerRisk || 'balanced');
        if (!result.available || !result.best) {
          alert(result.reason || 'Optimizer tidak tersedia.');
          return;
        }
        state.draft = deepClone(result.best.decision);
        persistLocal();
        if (state.roomCode) {
          for (const [field, value] of Object.entries(state.draft)) {
            await patchDraft(state, field, value);
          }
          await refreshRoom({ rerender: false });
        }
        activeTab = 'optimizer';

      } else if (action === 'export-optimizer-brief') {
        exportOptimizerBrief();

      } else if (action === 'toggle-surprise') {
        await updateCaptainSetting(() => { state.surpriseMode = !state.surpriseMode; });

      } else if (action === 'rename-team') {
        const name = document.querySelector('#setupTeam')?.value?.trim();
        if (name && captainOnly('Perubahan nama tim')) {
          state.teamName = name.toUpperCase();
          userCompany(state).name = state.teamName;
          persistLocal();
          if (state.roomCode) await commitCanonicalState();
        }

      } else if (action === 'reset-game') {
        if (!captainOnly('Reset game')) return;
        if (confirm('Reset game kembali ke Round 0?')) {
          const { roomCode, roomKey, roomMembers, revision } = state;
          const teamName = state.teamName;
          const selectedMode = state.mode;
          state = makeInitialState(teamName);
          state.mode = selectedMode;
          state.maxRounds = selectedMode === 'workbook' ? WORKBOOK_RESULT_ROUNDS : MAX_ROUNDS;
          if (roomCode) {
            state.roomCode = roomCode;
            state.roomKey = roomKey;
            state.roomMembers = roomMembers || [];
            state.revision = revision || 0;
          }
          persistLocal();
          if (state.roomCode) await commitCanonicalState();
          parityRound = 0;
          activeTab = 'dashboard';
        }

      } else if (action === 'export-competition-brief') {
        exportCompetitionBrief();

      } else if (action === 'export-save') {
        exportGame(state);

      } else if (action === 'import-save') {
        document.querySelector('#importFile')?.click();
        return;

      } else if (action === 'leave-room') {
        state.roomCode = '';
        state.roomKey = '';
        state.roomMembers = [];
        state.revision = 0;
        clearRoomSession();
        persistLocal();
        clearInterval(pollTimer);
        activeTab = 'setup';

      } else if (action === 'create-room') {
        const url = document.querySelector('#supabaseUrl')?.value?.trim();
        const key = document.querySelector('#supabaseKey')?.value?.trim();
        const displayName = document.querySelector('#memberName')?.value?.trim() || 'Captain';
        const creatorAccessKey = document.querySelector('#roomCreatorAccessKey')?.value || '';
        saveSupabaseConfig(url, key);

        if (!creatorAccessKey.trim()) {
          throw new Error('Creator Access Code wajib diisi. Hanya creator yang diberi akses oleh owner yang dapat membuat online room.');
        }

        state.roomCode = randomRoomCode();
        state.roomKey = randomRoomKey();
        state.revision = 0;
        const payload = await createRoom(state, displayName, creatorAccessKey);
        applyRoomPayload(payload, state.roomCode, state.roomKey);
        startPolling();
        activeTab = 'setup';

      } else if (action === 'remove-member') {
        if (!captainOnly('Kick member')) return;

        const button = event.currentTarget;
        const memberId = button?.dataset?.memberId || '';
        const memberName = button?.dataset?.memberName || 'member';

        if (!memberId) throw new Error('Member target tidak valid.');
        if (!confirm(`Keluarkan ${memberName} dari room ini?`)) return;

        const payload = await removeRoomMember(state, memberId);
        if (payload?.state) {
          applyRoomPayload(payload);
        } else if (Array.isArray(payload?.members)) {
          state.roomMembers = payload.members;
          saveLocal(state, { touch: false });
        }
        activeTab = 'setup';

      } else if (action === 'provision-captain-recovery') {
        if (!captainOnly('Captain recovery')) return;
        const payload = await provisionCaptainRecovery(state);
        alert(`Captain Recovery Code dibuat: ${payload.captain_recovery_code}\n\nSimpan kode ini bersama Room Code + Room Key.`);
        activeTab = 'setup';

      } else if (action === 'copy-recovery-code') {
        const recovery = getCaptainRecovery();
        if (!recovery?.recoveryCode) throw new Error('Recovery Code belum tersedia.');
        await navigator.clipboard.writeText(recovery.recoveryCode);
        alert('Captain Recovery Code copied.');

      } else if (action === 'resume-captain') {
        const url = document.querySelector('#supabaseUrl')?.value?.trim();
        const key = document.querySelector('#supabaseKey')?.value?.trim();
        const roomCode = document.querySelector('#resumeCode')?.value?.trim().toUpperCase();
        const roomKey = document.querySelector('#resumeKey')?.value?.trim().toUpperCase();
        const recoveryCode = document.querySelector('#resumeRecoveryCode')?.value?.trim();
        const displayName = document.querySelector('#resumeName')?.value?.trim() || 'Captain';
        saveSupabaseConfig(url, key);

        if (!roomCode || !roomKey || !recoveryCode) {
          throw new Error('Room Code, Room Key, dan Captain Recovery Code wajib diisi.');
        }

        const payload = await resumeCaptain(roomCode, roomKey, recoveryCode, displayName);
        applyRoomPayload(payload, roomCode, roomKey);
        startPolling();
        activeTab = 'dashboard';

      } else if (action === 'join-room') {
        const url = document.querySelector('#supabaseUrl')?.value?.trim();
        const key = document.querySelector('#supabaseKey')?.value?.trim();
        const roomCode = document.querySelector('#joinCode')?.value?.trim().toUpperCase();
        const roomKey = document.querySelector('#joinKey')?.value?.trim().toUpperCase();
        const displayName = document.querySelector('#joinName')?.value?.trim() || 'Member';
        saveSupabaseConfig(url, key);

        const payload = await joinRoom(roomCode, roomKey, displayName);
        applyRoomPayload(payload, roomCode, roomKey);
        startPolling();
        activeTab = 'dashboard';
      }

      render();
    } catch (error) {
      alert(error?.message || String(error));
    }
  }));

  const importFile = document.querySelector('#importFile');
  importFile?.addEventListener('change', async event => {
    try {
      state = migrateState(await importGame(event.target.files?.[0]));
      state.roomCode = '';
      state.roomKey = '';
      state.roomMembers = [];
      state.revision = 0;
      clearRoomSession();
      localStorage.setItem(ROLE_KEY, 'captain');
      saveLocal(state);
      activeTab = 'dashboard';
      render();
    } catch (error) {
      alert(error?.message || 'Import gagal.');
    }
  });
}

mobileSidebarQuery.addEventListener?.('change', event => {
  sidebarCollapsed = event.matches
    ? true
    : localStorage.getItem(SIDEBAR_KEY) === '1';
  render(false);
});

startPolling();
render();
