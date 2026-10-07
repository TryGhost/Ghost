/**
 * Public surface of the auth domain, consumed by the admin shell
 * (apps/admin/src/app.tsx and routes.tsx) and the editor: its in-place sign-in
 * dialog and its reload on an expired session. Everything else in this domain is
 * internal.
 */
export { authRoutes, type AuthRouteHandle } from './auth-routes';
export { SignedOutApp } from './auth-route';
export { useAuthNotice } from './auth-notice';
export { ResendCodeButton } from './resend-code-button';
export { reloadAdmin } from './reload';
export { useAuthScreensOwner } from './use-auth-screens-owner';
