import Growth from './views/Stats/Growth';
import Locations from './views/Stats/Locations';
import Newsletters from './views/Stats/Newsletters';
import Overview from './views/Stats/Overview';
import Web from './views/Stats/Web';
import {RouteObject} from '@tryghost/admin-x-framework';
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
                element: <Overview />
            },
            {
                path: 'web',
                element: <Web />
            },
            {
                path: 'locations',
                element: <Locations />
            },
            {
                path: 'growth',
                element: <Growth />
            },
            {
                path: 'newsletters',
                element: <Newsletters />
            }
        ]
    }
];
