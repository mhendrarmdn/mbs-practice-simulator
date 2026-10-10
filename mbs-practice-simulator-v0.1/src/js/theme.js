import { THEME_KEY } from './config.js';

const VALID_THEMES = ['light', 'dark', 'system'];

export function getThemePreference() {
  const saved = localStorage.getItem(THEME_KEY);
  return VALID_THEMES.includes(saved) ? saved : 'system';
}

export function resolveTheme(preference = getThemePreference()) {
  if (preference !== 'system') return preference;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(preference = getThemePreference()) {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#071521' : '#f2f5f8');
  return resolved;
}

export function setThemePreference(preference) {
  const safe = VALID_THEMES.includes(preference) ? preference : 'system';
  localStorage.setItem(THEME_KEY, safe);
  return applyTheme(safe);
}

export function initTheme() {
  applyTheme();
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const listener = () => {
    if (getThemePreference() === 'system') applyTheme('system');
  };
  media?.addEventListener?.('change', listener);
  return () => media?.removeEventListener?.('change', listener);
}
