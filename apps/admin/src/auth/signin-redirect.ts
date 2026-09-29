import { isAuthPath } from '@tryghost/admin-x-framework/helpers';

// Shared with Ember's authenticated route and session service, so either shell
// can store the route a signed-out visitor asked for and the other can use it.
const SIGNIN_REDIRECT_KEY = 'ghost-signin-redirect';

const isRedirectTarget = (route: string | null): route is string =>
  Boolean(route) && route !== '/' && !isAuthPath(route!);

/** Remembers where a signed-out visitor was going; the latest attempt wins. */
export function rememberSigninRedirect(route: string): void {
  try {
    if (isRedirectTarget(route)) {
      window.sessionStorage.setItem(SIGNIN_REDIRECT_KEY, route);
    }
  } catch {
    // Storage can be unavailable; signing in then lands on the home route.
  }
}

/** The route to open after signing in, cleared so it is used once. */
export function takeSigninRedirect(): string {
  try {
    const route = window.sessionStorage.getItem(SIGNIN_REDIRECT_KEY);
    window.sessionStorage.removeItem(SIGNIN_REDIRECT_KEY);
    return isRedirectTarget(route) ? route : '/';
  } catch {
    return '/';
  }
}
