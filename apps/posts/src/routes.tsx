import {type AdminRouteHandle, RouteObject, lazyComponent} from '@tryghost/admin-x-framework';
import {ErrorPage} from '@tryghost/shade/primitives';
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
            ...(['posts', 'pages'] as const).map(contentGroup => ({
                // Post/Page Analytics
                path: `${contentGroup}/analytics/:postId`,
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
                            <PostAnalyticsProvider contentType={contentGroup === 'pages' ? 'page' : 'post'}>
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
                    ...(contentGroup === 'posts' ? [{
                        path: 'growth',
                        lazy: lazyComponent(() => import('@views/PostAnalytics/Growth/growth'))
                    },
                    {
                        path: 'newsletter',
                        lazy: lazyComponent(() => import('@views/PostAnalytics/Newsletter/newsletter'))
                    }] : [])
                ]
            })),
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
                path: 'automations',
                children: [
                    {
                        index: true,
                        lazy: lazyComponent(() => import('@views/Automations/automations'))
                    },
                    {
                        path: ':id',
                        handle: {hideAdminSidebar: true} satisfies AdminRouteHandle,
                        lazy: lazyComponent(() => import('@views/Automations/editor'))
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
