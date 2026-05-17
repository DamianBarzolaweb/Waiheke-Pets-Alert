import { environment } from '../../environments/environment';

/** Base del API: en dev vacío + proxy, o URL absoluta en producción. */
export function apiUrl(path: string): string {
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
