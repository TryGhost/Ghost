import Growth from './views/Stats/Growth';
import Locations from './views/Stats/Locations';
import Newsletters from './views/Stats/Newsletters';
import Sources from './views/Stats/Sources';
import Web from './views/Stats/Web';
import {RouteObject} from '@tryghost/admin-x-framework';
import {withFeatureFlag} from './hooks/withFeatureFlag';

export const APP_ROUTE_PREFIX = '/stats';

// Wrap all components with feature flag protection
const ProtectedWeb = withFeatureFlag(Web, 'trafficAnalyticsAlpha', '/web/', 'Web');
const ProtectedSources = withFeatureFlag(Sources, 'trafficAnalyticsAlpha', '/web/', 'Sources');
const ProtectedLocations = withFeatureFlag(Locations, 'trafficAnalyticsAlpha', '/web/', 'Locations');
const ProtectedGrowth = withFeatureFlag(Growth, 'trafficAnalyticsAlpha', '/web/', 'Growth');
const ProtectedNewsletters = withFeatureFlag(Newsletters, 'trafficAnalyticsAlpha', '/web/', 'Newsletters');

export const routes: RouteObject[] = [
    {
        path: '',
        index: true,
        element: <ProtectedWeb />
    },
    {
        path: '/web/',
        element: <ProtectedWeb />
    },
    {
        path: '/sources/',
        element: <ProtectedSources />
    },
    {
        path: '/locations/',
        element: <ProtectedLocations />
    },
    {
        path: '/growth/',
        element: <ProtectedGrowth />
    }
    ,
    {
        path: '/newsletters/',
        element: <ProtectedNewsletters />
    }
];
