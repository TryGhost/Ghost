import Growth from './views/PostAnalytics/Growth';
import Web from './views/PostAnalytics/Web';
import {ErrorPage} from '@tryghost/shade';
import {Navigate, RouteObject} from '@tryghost/admin-x-framework';

export const APP_ROUTE_PREFIX = '/posts';

export const routes: RouteObject[] = [
    {
        // Root route configuration
        path: '',
        errorElement: <ErrorPage onBackToDashboard={() => {}} />, // @TODO: add back to dashboard click handle
        children: [
            {
                path: 'analytics/:postId',
                index: true,
                element: <Navigate crossApp={true} to='/posts/analytics/:postId' />
            },
            {
                path: 'analytics/:postId/web',
                index: true,
                element: <Web />
            },
            {
                path: 'analytics/:postId/growth',
                index: true,
                element: <Growth />
            },
            {
                path: '*',
                element: <ErrorPage onBackToDashboard={() => {}} /> // @TODO: add back to dashboard click handle
            }
        ]
    }
];
