import { CONFIG_KEY, ROLE_KEY, ROOM_SESSION_KEY } from './config.js';

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

export function getRoomSession() {
  try {
    return JSON.parse(localStorage.getItem(ROOM_SESSION_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveRoomSession(session) {
  localStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(session || {}));
  if (session?.role) localStorage.setItem(ROLE_KEY, session.role);
}

export function clearRoomSession() {
  localStorage.removeItem(ROOM_SESSION_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export async function rpc(name, params) {
  const config = getSupabaseConfig();
  if (!config.url || !config.key) throw new Error('Supabase URL / anon key belum diset.');

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
  if (!response.ok) {
    let parsed = null;
    try { parsed = text ? JSON.parse(text) : null; } catch {}
    const rawMessage = parsed?.message || text || `HTTP ${response.status}`;
    const digestMissing = parsed?.code === '42883' && String(rawMessage).includes('digest');
    const error = new Error(
      digestMissing
        ? 'Supabase pgcrypto belum terlihat oleh RPC room. Jalankan migration supabase/fix_pgcrypto_search_path_v131.sql di Supabase SQL Editor, lalu coba Create Online Room lagi.'
        : rawMessage
    );
    error.status = response.status;
    error.code = parsed?.code || '';
    error.details = parsed?.details || null;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

function missingRpc(error) {
  const text = String(error?.message || '');
  return error?.status === 404 || text.includes('PGRST202') || text.includes('Could not find the function');
}

export function randomRoomCode() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `MBS-${n}`;
}

export function randomRoomKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let i = 0; i < 8; i += 1) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}

export function randomMemberToken() {
  if (crypto?.randomUUID) return crypto.randomUUID().replaceAll('-', '');
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let value = '';
  for (let i = 0; i < 32; i += 1) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}

function payloadFromLegacy(state, role = isCaptain() ? 'captain' : 'member') {
  return {
    state,
    revision: Number(state?.revision || 0),
    role,
    members: []
  };
}

export async function createRoom(state, displayName = 'Captain') {
  const memberToken = randomMemberToken();
  try {
    const payload = await rpc('mbs_create_room_v03', {
      p_room_code: state.roomCode,
      p_secret: state.roomKey,
      p_captain_token: memberToken,
      p_display_name: displayName || 'Captain',
      p_state: state
    });
    saveRoomSession({
      memberToken,
      memberId: payload?.member_id || '',
      displayName: payload?.display_name || displayName || 'Captain',
      role: 'captain',
      protocol: 'v03'
    });
    return payload;
  } catch (error) {
    if (!missingRpc(error)) throw error;
    await rpc('mbs_create_room', {
      p_room_code: state.roomCode,
      p_secret: state.roomKey,
      p_state: state
    });
    saveRoomSession({ memberToken, displayName, role: 'captain', protocol: 'legacy' });
    return payloadFromLegacy(state, 'captain');
  }
}

export async function joinRoom(roomCode, roomKey, displayName = 'Member') {
  const memberToken = randomMemberToken();
  try {
    const payload = await rpc('mbs_join_room_v03', {
      p_room_code: roomCode,
      p_secret: roomKey,
      p_member_token: memberToken,
      p_display_name: displayName || 'Member'
    });
    saveRoomSession({
      memberToken,
      memberId: payload?.member_id || '',
      displayName: payload?.display_name || displayName || 'Member',
      role: payload?.role || 'member',
      protocol: 'v03'
    });
    return payload;
  } catch (error) {
    if (!missingRpc(error)) throw error;
    const remote = await rpc('mbs_get_room', { p_room_code: roomCode, p_secret: roomKey });
    saveRoomSession({ memberToken, displayName, role: 'member', protocol: 'legacy' });
    return payloadFromLegacy(remote, 'member');
  }
}

export async function getRoom(roomCode, roomKey) {
  const session = getRoomSession();
  if (session?.protocol === 'v03' && session.memberToken) {
    try {
      return await rpc('mbs_get_room_v03', {
        p_room_code: roomCode,
        p_secret: roomKey,
        p_member_token: session.memberToken
      });
    } catch (error) {
      if (!missingRpc(error)) throw error;
    }
  }

  const remote = await rpc('mbs_get_room', {
    p_room_code: roomCode,
    p_secret: roomKey
  });
  return payloadFromLegacy(remote);
}

export async function patchDraft(state, field, value) {
  const session = getRoomSession();
  if (session?.protocol === 'v03' && session.memberToken) {
    try {
      return await rpc('mbs_patch_draft_v03', {
        p_room_code: state.roomCode,
        p_secret: state.roomKey,
        p_member_token: session.memberToken,
        p_field: field,
        p_value: value
      });
    } catch (error) {
      if (!missingRpc(error)) throw error;
    }
  }

  await rpc('mbs_update_room', {
    p_room_code: state.roomCode,
    p_secret: state.roomKey,
    p_state: state
  });
  return payloadFromLegacy(state);
}

export async function commitRoom(state) {
  const session = getRoomSession();
  if (session?.protocol === 'v03' && session.memberToken) {
    try {
      return await rpc('mbs_commit_state_v03', {
        p_room_code: state.roomCode,
        p_secret: state.roomKey,
        p_member_token: session.memberToken,
        p_expected_revision: Number(state.revision || 0),
        p_state: state
      });
    } catch (error) {
      if (!missingRpc(error)) throw error;
    }
  }

  await rpc('mbs_update_room', {
    p_room_code: state.roomCode,
    p_secret: state.roomKey,
    p_state: state
  });
  return payloadFromLegacy(state);
}

export async function updateRoom(state) {
  return commitRoom(state);
}

export function isCaptain() {
  const session = getRoomSession();
  if (session?.role) return session.role === 'captain';
  return (localStorage.getItem(ROLE_KEY) || 'captain') === 'captain';
}
