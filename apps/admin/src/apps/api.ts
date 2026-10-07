/**
 * Public surface of the apps domain, consumed by the admin shell
 * (routes, sidebar and global search). Everything else in this domain is internal.
 */
export { canManageApps } from './permissions';
export { needsApproval, useActiveInstallations } from './lib/installations';
export { setAppPinned, usePinnedApps } from './lib/pins';
export { appRoute } from './lib/routes';
export { AppIcon } from './components/app-icon';

// Lazy entries, not component re-exports: the shell mounts these behind
// `lazy:`, so static re-exports would pull the chunks into the shell bundle.
export const lazyAppsScreen = () => import('./apps');
export const lazyAppInstallScreen = () => import('./install');
export const lazyAppViewScreen = () => import('./app-view');
