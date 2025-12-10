import {RouteObject, lazyComponent} from '@tryghost/admin-x-framework';
// import {withFeatureFlag} from './hooks/withFeatureFlag';

export const APP_ROUTE_PREFIX = '/';

// Wrap all components with feature flag protection
//  e.g.
// const ProtectedOverview = withFeatureFlag(Overview, 'trafficAnalyticsAlpha', '/', 'Overview');

export const routes: RouteObject[] = [
    {
        path: 'analytics',
        children: [
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
        ]
    }
];
