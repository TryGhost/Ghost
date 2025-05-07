import Growth from './views/Stats/Growth';
import Locations from './views/Stats/Locations';
import Newsletters from './views/Stats/Newsletters';
import Sources from './views/Stats/Sources';
import Web from './views/Stats/Web';
import {RouteObject} from '@tryghost/admin-x-framework';
import {withFeatureFlag} from './hooks/withFeatureFlag';

export const APP_ROUTE_PREFIX = '/stats';

// Wrap all components with feature flag protection
const ProtectedNewsletters = withFeatureFlag(Newsletters, 'trafficAnalyticsAlpha', '/web/', 'Newsletters');

export const routes: RouteObject[] = [
    {
        path: '',
        index: true,
        element: <Web />
    },
    {
        path: '/web/',
        element: <Web />
    },
    {
        path: '/sources/',
        element: <Sources />
    },
    {
        path: '/locations/',
        element: <Locations />
    },
    {
        path: '/growth/',
        element: <Growth />
    }
    ,
    {
        path: '/newsletters/',
        element: <ProtectedNewsletters />
    }
];
