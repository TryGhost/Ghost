/**
 * Public surface of the apps domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx and the sidebar). Everything else in this domain
 * is internal.
 */
export { canManageApps } from './permissions';
export { AppNavIcon } from './components/app-icon';
export { PINS_FULL_MESSAGE } from './lib/pins';
export { useSidebarApps, type SidebarApp } from './lib/use-sidebar-apps';

// Lazy entries, not component re-exports: the shell mounts these behind
// `lazy:`, so static re-exports would pull the chunks into the shell bundle.
export const lazyAppsScreen = () => import('./apps');
export const lazyAppInstallScreen = () => import('./install');
export const lazyAppDetailsScreen = () => import('./app-details');
