import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }
  const body = err.error;
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (body && typeof body === 'object' && 'error' in body) {
    const msg = (body as { error?: unknown }).error;
    if (typeof msg === 'string' && msg.trim()) {
      return msg;
    }
  }
  if (err.status === 0) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return fallback;
}
