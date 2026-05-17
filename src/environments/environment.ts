/**
 * Producción (Netlify/static, etc.):
 * Definí `window.__WPA_API_BASE__` en src/index.html (script antes de `<app-root>`), p. ej.:
 *   window.__WPA_API_BASE__ = 'https://tu-api.herokuapp.com';
 * Sin eso queda cadena vacía y las llamadas `/api` fallan salvo mismo origen/host.
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
