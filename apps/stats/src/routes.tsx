import Growth from './views/Stats/Growth';
import Locations from './views/Stats/Locations';
import Newsletters from './views/Stats/Newsletters';
import Sources from './views/Stats/Sources';
import Web from './views/Stats/Web';
import {RouteObject} from '@tryghost/admin-x-framework';

export const APP_ROUTE_PREFIX = '/stats';

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
        element: <Newsletters />
    }
];
