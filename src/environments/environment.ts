/**
 * Production (Netlify/static, etc.):
 * Define `window.__WPA_API_BASE__` in src/index.html (script before `<app-root>`), e.g.:
 *   window.__WPA_API_BASE__ = 'https://your-api.herokuapp.com';
 * Without it, the value is empty and `/api` calls fail unless same origin/host.
 */
declare global {
  interface Window {
    __WPA_API_BASE__?: string;
  }
}

function productionApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const raw = String(window.__WPA_API_BASE__ ?? '').trim();
  return raw.replace(/\/$/, '');
}

export const environment = {
  production: true,
  apiBaseUrl: productionApiBaseUrl(),
};
