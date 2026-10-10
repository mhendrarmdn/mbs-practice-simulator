import { CONFIG_KEY, ROLE_KEY } from './config.js';

export function getSupabaseConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveSupabaseConfig(url, key) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({
    url: String(url || '').replace(/\/$/, ''),
    key: String(key || '')
  }));
}

export async function rpc(name, params) {
  const config = getSupabaseConfig();
  if (!config.url || !config.key) {
    throw new Error('Supabase URL / anon key belum diset.');
  }

  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.key,
      Authorization: `Bearer ${config.key}`
    },
    body: JSON.stringify(params)
  });

  const text = await response.text();
  if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
  return text ? JSON.parse(text) : null;
}

export function randomRoomCode() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `MBS-${n}`;
}

export function randomRoomKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let i = 0; i < 8; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

export async function createRoom(state) {
  await rpc('mbs_create_room', {
    p_room_code: state.roomCode,
    p_secret: state.roomKey,
    p_state: state
  });
  localStorage.setItem(ROLE_KEY, 'captain');
  return state;
}

export async function joinRoom(roomCode, roomKey) {
  const remote = await rpc('mbs_get_room', {
    p_room_code: roomCode,
    p_secret: roomKey
  });
  localStorage.setItem(ROLE_KEY, 'member');
  return remote;
}

export async function getRoom(roomCode, roomKey) {
  return rpc('mbs_get_room', {
    p_room_code: roomCode,
    p_secret: roomKey
  });
}

export async function updateRoom(state) {
  return rpc('mbs_update_room', {
    p_room_code: state.roomCode,
    p_secret: state.roomKey,
    p_state: state
  });
}

export function isCaptain() {
  return (localStorage.getItem(ROLE_KEY) || 'captain') === 'captain';
}
