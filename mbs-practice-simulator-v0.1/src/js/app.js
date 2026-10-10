import '../css/app.css';
import { ROUND1_REFERENCE, ROLE_KEY } from './config.js';
import { makeInitialState, loadState, migrateState, saveLocal, userCompany } from './state.js';
import { simulateRound } from './simulator.js';
import {
  createRoom, getRoom, joinRoom, randomRoomCode, randomRoomKey,
  saveSupabaseConfig, updateRoom
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
let remoteSaveTimer = null;
let suppressRemoteSave = false;
initTheme();

function markSync(text) {
  const badge = document.querySelector('#syncBadge');
  if (badge) badge.textContent = text;
}

function persistLocal() {
  saveLocal(state);
  markSync(state.roomCode ? '● Local cache' : '● Saved');
}

async function persistRemoteNow() {
  if (!state.roomCode || !state.roomKey || suppressRemoteSave) return;
  try {
    markSync('● Syncing');
    await updateRoom(state);
    markSync('● Online');
  } catch (error) {
    console.warn('Remote save failed:', error);
    markSync('● Offline cache');
  }
}

function queueRemoteSave() {
  persistLocal();
  if (!state.roomCode || !state.roomKey) return;
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(persistRemoteNow, 450);
}

async function syncFromRemote() {
  if (!state.roomCode || !state.roomKey) return;
  try {
    const remote = await getRoom(state.roomCode, state.roomKey);
    if (remote?.updatedAt && remote.updatedAt !== state.updatedAt) {
      suppressRemoteSave = true;
      state = migrateState(remote);
      saveLocal(state);
      suppressRemoteSave = false;
      render();
    }
    markSync('● Online');
  } catch (error) {
    console.warn('Remote sync failed:', error);
    markSync('● Offline cache');
  }
}

function startPolling() {
  clearInterval(pollTimer);
  if (state.roomCode && state.roomKey) pollTimer = setInterval(syncFromRemote, 2500);
}

function startTimer() {
  clearInterval(timerTick);
  if (state.mode !== 'competition' || state.currentRound >= state.maxRounds || state.decisionLocked) return;
  timerTick = setInterval(() => {
    state.timerRemaining = Math.max(0, Number(state.timerRemaining || state.timerSeconds) - 1);
    if (state.timerRemaining <= 0) {
      state.decisionLocked = true;
      state.lockReason = 'Competition timer expired';
      clearInterval(timerTick);
      queueRemoteSave();
    } else {
      saveLocal(state);
    }
    render(false);
  }, 1000);
}

function render(restart = true) {
  root.innerHTML = shell(state, activeTab, getThemePreference());
  document.querySelector('#content').innerHTML = bodyForTab(state, activeTab);
  bindEvents();
  if (restart) startTimer();
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

  document.querySelector('#modeSelect')?.addEventListener('change', event => {
    state.mode = event.target.value;
    state.decisionLocked = false;
    state.lockReason = '';
    state.timerRemaining = state.timerSeconds;
    queueRemoteSave();
    render();
  });

  document.querySelectorAll('[data-decision]').forEach(input => {
    input.addEventListener('input', () => {
      if (state.decisionLocked) return;
      state.draft[input.dataset.decision] = Number(input.value);
      queueRemoteSave();
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
        queueRemoteSave();
      } else if (action === 'toggle-lock') {
        state.decisionLocked = !state.decisionLocked;
        state.lockReason = state.decisionLocked ? 'Manual lock' : '';
        queueRemoteSave();
      } else if (action === 'submit-round') {
        if (!state.decisionLocked && state.currentRound < state.maxRounds) {
          simulateRound(state);
          queueRemoteSave();
          activeTab = 'dashboard';
        }
      } else if (action === 'toggle-surprise') {
        state.surpriseMode = !state.surpriseMode;
        queueRemoteSave();
      } else if (action === 'rename-team') {
        const name = document.querySelector('#setupTeam')?.value?.trim();
        if (name) {
          state.teamName = name.toUpperCase();
          userCompany(state).name = state.teamName;
          queueRemoteSave();
        }
      } else if (action === 'reset-game') {
        if (confirm('Reset game kembali ke Round 0?')) {
          const teamName = state.teamName;
          state = makeInitialState(teamName);
          activeTab = 'dashboard';
          queueRemoteSave();
        }
      } else if (action === 'export-save') {
        exportGame(state);
      } else if (action === 'import-save') {
        document.querySelector('#importFile')?.click();
        return;
      } else if (action === 'create-room') {
        const url = document.querySelector('#supabaseUrl')?.value?.trim();
        const key = document.querySelector('#supabaseKey')?.value?.trim();
        saveSupabaseConfig(url, key);
        state.roomCode = randomRoomCode();
        state.roomKey = randomRoomKey();
        await createRoom(state);
        queueRemoteSave();
        startPolling();
      } else if (action === 'join-room') {
        const url = document.querySelector('#supabaseUrl')?.value?.trim();
        const key = document.querySelector('#supabaseKey')?.value?.trim();
        const roomCode = document.querySelector('#joinCode')?.value?.trim().toUpperCase();
        const roomKey = document.querySelector('#joinKey')?.value?.trim().toUpperCase();
        saveSupabaseConfig(url, key);
        const remote = await joinRoom(roomCode, roomKey);
        state = migrateState(remote);
        state.roomCode = roomCode;
        state.roomKey = roomKey;
        saveLocal(state);
        startPolling();
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
