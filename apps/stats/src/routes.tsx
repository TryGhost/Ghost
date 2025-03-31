import Overview from './views/Overview';
import {RouteObject} from '@tryghost/admin-x-framework';

export const APP_ROUTE_PREFIX = '/stats-x';

export const routes: RouteObject[] = [
    {
        path: '',
        index: true,
        element: <Overview />
    }
];
