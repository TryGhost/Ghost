/**
 * Public surface of the posts domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx). Everything else in this domain is internal.
 */
export { lazyPostAnalyticsRoot, postAnalyticsRouteChildren } from './analytics/routes';
export { POST_VIEW_PARAMS } from './list/post-view-params';
export { getPostListReturnUrl, getStickyPostFilterUrl } from './list/posts-sticky-filters';
export type { PostResource } from './list/post-resource';

// Lazy route entries keep the posts and pages list chunks out of the shell
// while still exposing them through the domain boundary.
export const lazyPostsListRoute = () => import('./list/posts-route');
export const lazyPagesListRoute = () => import('./list/pages-route');

export const lazyPostDebugScreen = () => import('./debug/post-debug');
