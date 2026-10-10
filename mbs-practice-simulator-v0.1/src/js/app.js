import '../css/app.css';
import { ROUND1_REFERENCE, ROLE_KEY } from './config.js';
import { makeInitialState, loadState, saveLocal, userCompany } from './state.js';
import { simulateRound } from './simulator.js';
import {
  createRoom,
  getRoom,
  joinRoom,
  randomRoomCode,
  randomRoomKey,
  saveSupabaseConfig,
  updateRoom
} from './supabase.js';
import { bodyForTab, shell } from './views.js';
import { deepClone } from './utils.js';

const root = document.querySelector('#app');
let state = loadState();
let activeTab = 'dashboard';
let pollTimer = null;
let remoteSaveTimer = null;
let suppressRemoteSave = false;

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
      state = remote;
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
  if (state.roomCode && state.roomKey) {
    pollTimer = setInterval(syncFromRemote, 2500);
  }
}

function render() {
  root.innerHTML = shell(state, activeTab, bodyForTab(state, activeTab));
  attachEvents();
  if (state.roomCode) markSync('● Online room');
}

function setTab(tab) {
  activeTab = tab;
  render();
}

function attachEvents() {
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => setTab(button.dataset.tab));
  });

  document.querySelectorAll('[data-decision]').forEach(input => {
    input.addEventListener('input', () => {
      state.draft[input.dataset.decision] = Number(input.value);
      queueRemoteSave();
    });
  });

  const surpriseToggle = document.querySelector('#surpriseToggle');
  if (surpriseToggle) {
    surpriseToggle.addEventListener('change', () => {
      state.surpriseMode = surpriseToggle.checked;
      queueRemoteSave();
    });
  }

  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => handleAction(button.dataset.action));
  });
}

async function handleAction(action) {
  if (action === 'goto-decisions') {
    setTab('decisions');
    return;
  }

  if (action === 'load-r1') {
    state.draft = deepClone(ROUND1_REFERENCE);
    queueRemoteSave();
    render();
    return;
  }

  if (action === 'submit-round') {
    if (state.currentRound >= state.maxRounds) return;
    const ok = confirm(`Lock and submit decisions for Round ${state.currentRound + 1}?`);
    if (!ok) return;
    simulateRound(state);
    activeTab = 'dashboard';
    queueRemoteSave();
    render();
    return;
  }

  if (action === 'rename-team') {
    const input = document.querySelector('#setupTeam');
    const name = input?.value.trim();
    if (!name) return;
    state.teamName = name.toUpperCase();
    userCompany(state).name = state.teamName;
    queueRemoteSave();
    render();
    return;
  }

  if (action === 'reset-game') {
    const ok = confirm('Reset seluruh game dan kembali ke Round 0?');
    if (!ok) return;
    const teamName = state.teamName || 'MARKOWITZ';
    const oldRoomCode = state.roomCode;
    const oldRoomKey = state.roomKey;
    state = makeInitialState(teamName);
    if (oldRoomCode && oldRoomKey) {
      state.roomCode = oldRoomCode;
      state.roomKey = oldRoomKey;
    }
    queueRemoteSave();
    render();
    return;
  }

  if (action === 'create-room') {
    await handleCreateRoom();
    return;
  }

  if (action === 'join-room') {
    await handleJoinRoom();
  }
}

async function handleCreateRoom() {
  const url = document.querySelector('#supabaseUrl')?.value.trim();
  const key = document.querySelector('#supabaseKey')?.value.trim();
  const teamName = document.querySelector('#setupTeam')?.value.trim() || 'MARKOWITZ';

  if (!url || !key) {
    alert('Isi Supabase Project URL dan anon/publishable key terlebih dahulu.');
    return;
  }

  saveSupabaseConfig(url, key);
  state = makeInitialState(teamName);
  state.roomCode = randomRoomCode();
  state.roomKey = randomRoomKey();
  saveLocal(state);

  try {
    markSync('● Creating room');
    await createRoom(state);
    startPolling();
    render();
    alert(`Room berhasil dibuat.\n\nRoom Code: ${state.roomCode}\nRoom Key: ${state.roomKey}`);
  } catch (error) {
    console.error(error);
    alert(`Gagal membuat room:\n${error.message}`);
  }
}

async function handleJoinRoom() {
  const url = document.querySelector('#supabaseUrl')?.value.trim();
  const key = document.querySelector('#supabaseKey')?.value.trim();
  const roomCode = document.querySelector('#joinCode')?.value.trim().toUpperCase();
  const roomKey = document.querySelector('#joinKey')?.value.trim().toUpperCase();

  if (!url || !key || !roomCode || !roomKey) {
    alert('Isi Supabase URL, anon key, Room Code, dan Room Key.');
    return;
  }

  saveSupabaseConfig(url, key);

  try {
    markSync('● Joining');
    const remote = await joinRoom(roomCode, roomKey);
    state = remote;
    state.roomCode = roomCode;
    state.roomKey = roomKey;
    saveLocal(state);
    activeTab = 'dashboard';
    startPolling();
    render();
  } catch (error) {
    console.error(error);
    alert(`Tidak bisa join room:\n${error.message}`);
  }
}

window.addEventListener('beforeunload', () => {
  persistLocal();
});

startPolling();
render();
