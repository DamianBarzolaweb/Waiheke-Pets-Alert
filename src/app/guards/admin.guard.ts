import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { getStoredToken } from '../interceptors/auth.interceptor';

function tokenClaimsAdmin(): boolean {
  const token = getStoredToken();
  if (!token) {
    return false;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { is_admin?: boolean };
    return payload.is_admin === true;
  } catch {
    return false;
  }
}

/** Logged-in site admin only (``esAdmin`` / JWT ``is_admin``). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!getStoredToken()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: '/admin' } });
  }
  if (auth.isAdmin() || tokenClaimsAdmin()) {
    return true;
  }
  return router.createUrlTree(['/']);
};
