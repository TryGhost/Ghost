/**
 * Public surface of the posts domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx and the gift-link modal host). Everything else
 * in this domain is internal.
 */
export { lazyPostAnalyticsRoot, postAnalyticsRouteChildren } from './analytics/routes';

// Lazy route entries keep the posts and pages list chunks out of the shell
// while still exposing them through the domain boundary.
export const lazyPostsListRoute = () => import('./list/posts-route');
export const lazyPagesListRoute = () => import('./list/pages-route');

// Lazy entry, not a component re-export: the shell's host loads the modal on
// demand, so a static re-export would pull the chunk into the shell bundle.
export const lazyGiftLinkModal = () => import('./analytics/modals/gift-link-modal');
