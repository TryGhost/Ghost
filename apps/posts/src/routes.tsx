import PostAnalytics from './views/PostAnalytics/PostAnalytics';
import {RouteObject} from '@tryghost/admin-x-framework';

export const APP_ROUTE_PREFIX = '/posts';

export const routes: RouteObject[] = [
    {
        path: '',
        index: false,
        element: <></>
    },
    {
        path: '/analytics/postid/web',
        index: true,
        element: <PostAnalytics />
    }
];
