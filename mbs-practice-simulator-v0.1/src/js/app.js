import '../css/app.css';
import { ROUND1_REFERENCE, ROLE_KEY } from './config.js';
import { makeInitialState, loadState, migrateState, saveLocal, userCompany } from './state.js';
import { simulateRound } from './simulator.js';
import {
  clearRoomSession,
  commitRoom,
  createRoom,
  getRoom,
  getRoomSession,
  isCaptain,
  joinRoom,
  patchDraft,
  randomRoomCode,
  randomRoomKey,
  saveSupabaseConfig
} from './supabase.js';
import { bodyForTab, shell } from './views.js';
import { deepClone } from './utils.js';
import { exportGame, importGame } from './persistence.js';
import { getThemePreference, initTheme, setThemePreference } from './theme.js';

const root = document.querySelector('#app');
let state = loadState();
let activeTab = 'dashboard';
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
    console.warn('Remote sync failed:', error);
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
  root.innerHTML = shell(state, activeTab, getThemePreference());
  document.querySelector('#content').innerHTML = bodyForTab(state, activeTab);
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

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab;
      render();
    });
  });

  document.querySelector('#themeSelect')?.addEventListener('change', event => {
    setThemePreference(event.target.value);
    render(false);
  });

  document.querySelector('#modeSelect')?.addEventListener('change', async event => {
    if (!captainOnly('Perubahan mode')) {
      event.target.value = state.mode;
      return;
    }
    state.mode = event.target.value;
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
    input.addEventListener('input', () => {
      if (state.decisionLocked) return;
      const field = input.dataset.decision;
      const value = Number(input.value);
      state.draft[field] = value;
      queueDraftPatch(field, value);
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

  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', async () => {
    const action = button.dataset.action;
    try {
      if (action === 'goto-decisions') {
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
        state.roundDeadlineAt = state.mode === 'competition' && state.currentRound < state.maxRounds
          ? new Date(Date.now() + state.timerSeconds * 1000).toISOString()
          : null;
        persistLocal();

        const committed = state.roomCode ? await commitCanonicalState() : true;
        if (committed) activeTab = 'dashboard';

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
          state = makeInitialState(teamName);
          if (roomCode) {
            state.roomCode = roomCode;
            state.roomKey = roomKey;
            state.roomMembers = roomMembers || [];
            state.revision = revision || 0;
          }
          persistLocal();
          if (state.roomCode) await commitCanonicalState();
          activeTab = 'dashboard';
        }

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
        saveSupabaseConfig(url, key);

        state.roomCode = randomRoomCode();
        state.roomKey = randomRoomKey();
        state.revision = 0;
        const payload = await createRoom(state, displayName);
        applyRoomPayload(payload, state.roomCode, state.roomKey);
        startPolling();
        activeTab = 'setup';

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

startPolling();
render();
