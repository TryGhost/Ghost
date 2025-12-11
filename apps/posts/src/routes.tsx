import Comments from '@views/Comments/comments';
import Growth from '@views/PostAnalytics/Growth/growth';
import Newsletter from '@views/PostAnalytics/Newsletter/newsletter';
import Overview from '@views/PostAnalytics/Overview/overview';
import PostAnalytics from '@views/PostAnalytics/post-analytics';
import PostAnalyticsProvider from './providers/post-analytics-context';
import Tags from '@views/Tags/tags';
import Web from '@views/PostAnalytics/Web/web';
import {ErrorPage} from '@tryghost/shade';
import {RouteObject} from '@tryghost/admin-x-framework';
// import {withFeatureFlag} from '@src/hooks/with-feature-flag';

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
            {
                path: 'comments',
                element: <Comments />
            },

            // Error handling
            {
                path: '*',
                element: <ErrorPage onBackToDashboard={() => {}} /> // @TODO: add back to dashboard click handle
            }
        ]
    }
];
