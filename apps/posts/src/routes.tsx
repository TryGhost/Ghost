import {ErrorPage} from '@tryghost/shade';
import {RouteObject, lazyComponent} from '@tryghost/admin-x-framework';
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
                lazy: async () => {
                    const [
                        {default: PostAnalyticsProvider},
                        {default: PostAnalytics}
                    ] = await Promise.all([
                        import('./providers/post-analytics-context'),
                        import('./views/PostAnalytics/post-analytics')
                    ]);
                    return {
                        element: (
                            <PostAnalyticsProvider>
                                <PostAnalytics />
                            </PostAnalyticsProvider>
                        )
                    };
                },
                children: [
                    {
                        path: '',
                        lazy: lazyComponent(() => import('@views/PostAnalytics/Overview/overview'))
                    },
                    {
                        path: 'web',
                        lazy: lazyComponent(() => import('@views/PostAnalytics/Web/web'))
                    },
                    {
                        path: 'growth',
                        lazy: lazyComponent(() => import('@views/PostAnalytics/Growth/growth'))
                    },
                    {
                        path: 'newsletter',
                        lazy: lazyComponent(() => import('@views/PostAnalytics/Newsletter/newsletter'))
                    }
                ]
            },
            {
                path: 'tags',
                children: [
                    {
                        index: true,
                        lazy: lazyComponent(() => import('@views/Tags/tags'))
                    },
                    {
                        path: ':tagSlug',
                        element: null
                    }
                ]
            },
            {
                path: 'comments',
                lazy: lazyComponent(() => import('@views/comments/comments'))
            },
            {
                path: 'members-forward',
                lazy: lazyComponent(() => import('@views/members/members'))
            },

            // Error handling
            {
                path: '*',
                element: <ErrorPage onBackToDashboard={() => {}} /> // @TODO: add back to dashboard click handle
            }
        ]
    }
];
