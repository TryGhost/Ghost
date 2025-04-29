import PostAnalytics from './views/PostAnalytics/PostAnalytics';
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
                element: <PostAnalytics />
            },
            {
                path: '*',
                element: <ErrorPage onBackToDashboard={() => {}} /> // @TODO: add back to dashboard click handle
            }
        ]
    }
];
