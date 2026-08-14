import {type RouteObject, lazyComponent} from '@tryghost/admin-x-framework';

// The child routes under `/analytics`. The shell (apps/admin/src/routes.tsx)
// mounts these directly under an `analytics` route node that supplies the
// AnalyticsProvider — so these fragments live in the shell's route table
// rather than behind a separate provider subtree. `lazy:` is preserved for
// per-view code-splitting.
export const analyticsRouteChildren: RouteObject[] = [
    {
        index: true,
        lazy: lazyComponent(() => import('./views/Stats/Overview'))
    },
    {
        path: 'web',
        lazy: lazyComponent(() => import('./views/Stats/Web'))
    },
    {
        path: 'growth',
        lazy: lazyComponent(() => import('./views/Stats/Growth'))
    },
    {
        path: 'newsletters',
        lazy: lazyComponent(() => import('./views/Stats/Newsletters'))
    }
];
