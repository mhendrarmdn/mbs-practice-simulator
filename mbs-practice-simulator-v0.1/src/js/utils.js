export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const money = n => { const v = Number(n || 0); return '
export const num = n => Math.round(n || 0).toLocaleString('en-US');
export const pct = n => ((n || 0) * 100).toFixed(2) + '%';
export const fixed = (n, d = 2) => Number(n || 0).toFixed(d);
export const deepClone = value => JSON.parse(JSON.stringify(value));

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rngFrom(seed) {
  let a = hashString(seed);
  return function rng() {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
 + (Math.abs(v) < 100 ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(v).toLocaleString('en-US')); };
export const num = n => Math.round(n || 0).toLocaleString('en-US');
export const pct = n => ((n || 0) * 100).toFixed(2) + '%';
export const fixed = (n, d = 2) => Number(n || 0).toFixed(d);
export const deepClone = value => JSON.parse(JSON.stringify(value));

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rngFrom(seed) {
  let a = hashString(seed);
  return function rng() {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
