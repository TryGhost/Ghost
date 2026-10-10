/**
 * Public surface of the comments domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx). Everything else in this domain is internal.
 */

// Lazy entry, not a component re-export: the shell mounts it behind `lazy:`,
// so a static re-export would pull the chunk into the shell bundle.
export const lazyCommentsScreen = () => import('./comments');
