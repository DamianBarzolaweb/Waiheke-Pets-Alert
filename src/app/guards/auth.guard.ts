import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const TOKEN_KEY = 'wpa_token';

/** Require a stored session token before opening protected routes (e.g. report). */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  if (typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) {
    return true;
  }
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
