import { randomBytes, timingSafeEqual } from 'node:crypto';

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  if (!a.length || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function json(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function validRoomCode(value) {
  return /^MBS-[0-9]{4}$/.test(String(value || '').toUpperCase());
}

function validRoomKey(value) {
  return /^[A-HJ-NP-Z2-9]{8}$/.test(String(value || '').toUpperCase());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  const ownerSecret = String(process.env.ROOM_CREATOR_ACCESS_KEY || '');
  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  );

  if (ownerSecret.length < 24) {
    return json(res, 503, {
      error: 'Room creation belum diaktifkan dengan aman. Set ROOM_CREATOR_ACCESS_KEY (minimal 24 karakter) di Vercel.'
    });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 503, {
      error: 'Server room creator belum lengkap. Set SUPABASE_SERVICE_ROLE_KEY (atau SUPABASE_SECRET_KEY) di Vercel. Jangan gunakan prefix VITE_.'
    });
  }

  const body = req.body && typeof req.body === 'object'
    ? req.body
    : (() => {
        try { return JSON.parse(req.body || '{}'); } catch { return {}; }
      })();

  if (!safeEqual(body.creatorAccessKey, ownerSecret)) {
    return json(res, 403, { error: 'Creator Access Code tidak valid.' });
  }

  const roomCode = String(body.roomCode || '').toUpperCase();
  const roomKey = String(body.roomKey || '').toUpperCase();
  const memberToken = String(body.memberToken || '');
  const displayName = String(body.displayName || 'Captain').trim().slice(0, 40);
  const recoveryCode = randomBytes(18).toString('base64url');
  const state = body.state;

  if (!validRoomCode(roomCode) || !validRoomKey(roomKey)) {
    return json(res, 400, { error: 'Room Code / Room Key tidak valid.' });
  }

  if (memberToken.length < 16 || memberToken.length > 128) {
    return json(res, 400, { error: 'Captain token tidak valid.' });
  }

  if (!state || typeof state !== 'object' || !Array.isArray(state.companies)) {
    return json(res, 400, { error: 'Game state tidak valid.' });
  }

  const serializedState = JSON.stringify(state);
  if (serializedState.length > 1_500_000) {
    return json(res, 413, { error: 'Game state terlalu besar untuk room creation.' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/mbs_create_room_v04`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        p_room_code: roomCode,
        p_secret: roomKey,
        p_captain_token: memberToken,
        p_captain_recovery_code: recoveryCode,
        p_display_name: displayName || 'Captain',
        p_state: state
      })
    });

    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch {}

    if (!response.ok) {
      const code = payload?.code || '';
      const message = payload?.message || 'Supabase room creation failed.';
      if (code === '23505') {
        return json(res, 409, { error: 'Room Code collision. Coba Create Authorized Room lagi.' });
      }
      console.error('Authorized room creation failed:', code, message);
      if (code === 'PGRST202' || String(message).includes('mbs_create_room_v04')) {
        return json(res, 503, { error: 'Captain Recovery migration v1.5.0 belum dijalankan di Supabase.' });
      }
      return json(res, 502, { error: 'Server gagal membuat room. Periksa Supabase migration dan server environment.' });
    }

    return json(res, 200, { ...(payload || {}), captain_recovery_code: recoveryCode });
  } catch (error) {
    console.error('Room creation endpoint error:', error?.message || error);
    return json(res, 500, { error: 'Room creation service tidak tersedia.' });
  }
}
