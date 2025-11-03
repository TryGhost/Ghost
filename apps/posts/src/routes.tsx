import Growth from './views/PostAnalytics/Growth/Growth';
import Newsletter from './views/PostAnalytics/Newsletter/Newsletter';
import Overview from './views/PostAnalytics/Overview/Overview';
import PostAnalytics from './views/PostAnalytics/PostAnalytics';
import PostAnalyticsProvider from './providers/PostAnalyticsContext';
import Tags from './views/Tags/Tags';
import Web from './views/PostAnalytics/Web/Web';
import {ErrorPage} from '@tryghost/shade';
import {RouteObject} from '@tryghost/admin-x-framework';
// import {withFeatureFlag} from '@src/hooks/withFeatureFlag';

export const APP_ROUTE_PREFIX = '/';

// Wrap components with feature flag protection where needed
//  e.g.
// const ProtectedNewsletter = withFeatureFlag(Newsletter, 'trafficAnalyticsAlpha', '/analytics/', 'Newsletter');

export const routes: RouteObject[] = [
    {
        // Root route configuration
        path: '',
        errorElement: <ErrorPage onBackToDashboard={() => {}} />, // @TODO: add back to dashboard click handle
        children: [
            {

                // Post Analytics
                path: 'posts/analytics/:postId',
                element: (
                    <PostAnalyticsProvider>
                        <PostAnalytics />
                    </PostAnalyticsProvider>
                ),
                children: [
                    {
                        path: '',
                        element: <Overview />
                    },
                    {
                        path: 'web',
                        element: <Web />
                    },
                    {
                        path: 'growth',
                        element: <Growth />
                    },
                    {
                        path: 'newsletter',
                        element: <Newsletter />
                    }
                ]
            },
            {
                path: 'tags',
                children: [
                    {
                        index: true,
                        element: <Tags />
                    },
                    {
                        path: ':tagSlug',
                        element: null
                    }
                ]
            },

            // Error handling
            {
                path: '*',
                element: <ErrorPage onBackToDashboard={() => {}} /> // @TODO: add back to dashboard click handle
            }
        ]
    }
];
