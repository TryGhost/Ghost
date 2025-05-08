import Growth from './views/PostAnalytics/Growth';
import Newsletter from './views/PostAnalytics/Newsletter';
import Web from './views/PostAnalytics/Web';
import {ErrorPage} from '@tryghost/shade';
import {Navigate, RouteObject} from '@tryghost/admin-x-framework';
import {withFeatureFlag} from '@src/hooks/withFeatureFlag';

export const APP_ROUTE_PREFIX = '/posts';

// Wrap the Newsletter component with the feature flag
const ProtectedNewsletter = withFeatureFlag(Newsletter, 'trafficAnalyticsAlpha', '/analytics/', 'Newsletter');

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
                path: 'analytics/:postId/newsletter',
                index: true,
                element: <ProtectedNewsletter />
            },
            {
                path: '*',
                element: <ErrorPage onBackToDashboard={() => {}} /> // @TODO: add back to dashboard click handle
            }
        ]
    }
];
