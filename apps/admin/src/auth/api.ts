/**
 * Public surface of the auth domain, consumed by the admin shell
 * (apps/admin/src/app.tsx and routes.tsx). Everything else in this domain is
 * internal.
 */
export { authRoutes, type AuthRouteHandle } from './auth-routes';
export { SignedOutApp } from './auth-route';
export { useAuthNotice } from './auth-notice';
export { useAuthScreensOwner } from './use-auth-screens-owner';
