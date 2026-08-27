import { type RouteObject, lazyComponent } from '@tryghost/admin-x-framework';

// The `/posts/analytics/:postId` subtree. The shell (apps/admin/src/routes.tsx)
// mounts a node with `lazy: lazyPostAnalyticsRoot` and these children; the root
// lazy composes the provider around the screen so neither chunk loads before
// the route is visited. `lazy:` is preserved for per-view code-splitting.
export const lazyPostAnalyticsRoot = async () => {
  const [{ default: PostAnalyticsProvider }, { default: PostAnalytics }] = await Promise.all([
    import('./providers/post-analytics-provider'),
    import('./post-analytics'),
  ]);
  return {
    element: (
      <PostAnalyticsProvider>
        <PostAnalytics />
      </PostAnalyticsProvider>
    ),
  };
};

export const postAnalyticsRouteChildren: RouteObject[] = [
  { path: '', lazy: lazyComponent(() => import('./overview/overview')) },
  { path: 'web', lazy: lazyComponent(() => import('./web/web')) },
  { path: 'growth', lazy: lazyComponent(() => import('./growth/growth')) },
  {
    path: 'newsletter',
    lazy: lazyComponent(() => import('./newsletter/newsletter')),
  },
];
