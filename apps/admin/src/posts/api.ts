/**
 * Public surface of the posts domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx and the gift-link modal host). Everything else
 * in this domain is internal.
 */
export { lazyPostAnalyticsRoot, postAnalyticsRouteChildren } from './analytics/routes';

// Lazy entry, not a component re-export: the shell's host loads the modal on
// demand, so a static re-export would pull the chunk into the shell bundle.
export const lazyGiftLinkModal = () => import('./analytics/modals/gift-link-modal');
