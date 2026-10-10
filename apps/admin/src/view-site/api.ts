/**
 * Public surface of the view-site domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx). Everything else in this domain is internal.
 */

// Lazy entry, not a component re-export: the shell mounts it behind `lazy()`,
// so a static re-export would pull the chunk into the shell bundle.
export const lazyViewSiteScreen = () => import('./view-site');

// Customize: the site's design edited from View site (the frame's top bar
// opens it). Small hooks, safe to import eagerly.
export {
  CUSTOMIZE_SITE_PATH,
  VIEW_SITE_PATH,
  useCanCustomizeSite,
  useIsCustomizingSite,
} from './customize';
