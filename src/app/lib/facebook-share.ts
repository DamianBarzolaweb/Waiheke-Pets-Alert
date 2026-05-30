import { alertHeadline, type PetAlert } from '../models/pet-alert.model';

/** Opens Facebook share dialog; preview comes from Open Graph on the alert URL. */
export function facebookSharerUrl(pageUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

export function alertPublicUrl(alertId: string, publicSiteBase: string): string {
  const base = publicSiteBase.replace(/\/$/, '');
  return `${base}/alertas/${encodeURIComponent(alertId)}`;
}

export function buildShareTitle(alert: PetAlert): string {
  return `Waiheke Pets Alert · ${alertHeadline(alert)} (${alert.status})`;
}

/** Short line for phone share sheets (link is passed separately). */
export function buildShareMessage(alert: PetAlert): string {
  const head = alertHeadline(alert);
  const parts = [head, alert.status, alert.location || '', alert.lastSeenWindow || ''].filter(Boolean);
  const desc = (alert.description || '').trim();
  const shortDesc = desc.length > 120 ? `${desc.slice(0, 117)}…` : desc;
  return [parts.join(' · '), shortDesc].filter(Boolean).join('\n');
}

export function buildAlertShareText(alert: PetAlert, publicUrl: string): string {
  const head = alertHeadline(alert);
  const lines = [
    `${head} — ${alert.status} on Waiheke Island`,
    alert.location ? `Area: ${alert.location}` : '',
    alert.lastSeenWindow ? `Last seen: ${alert.lastSeenWindow}` : '',
    (alert.fullDescription ?? alert.description).trim(),
    '',
    `Full alert with photo & map: ${publicUrl}`,
  ];
  return lines.filter(Boolean).join('\n');
}

export function nativeShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareViaNativeSheet(payload: {
  title: string;
  text: string;
  url: string;
}): Promise<'shared' | 'cancelled' | 'unavailable'> {
  if (!nativeShareSupported()) {
    return 'unavailable';
  }
  try {
    await navigator.share(payload);
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'cancelled';
    }
    return 'unavailable';
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
