import { environment } from '../../environments/environment';

/** API base: empty + proxy in dev, or absolute URL in production. */
export function apiUrl(path: string): string {
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
