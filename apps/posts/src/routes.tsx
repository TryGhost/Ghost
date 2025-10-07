import Growth from './views/PostAnalytics/Growth/Growth';
import Newsletter from './views/PostAnalytics/Newsletter/Newsletter';
import Overview from './views/PostAnalytics/Overview/Overview';
import PostAnalytics from './views/PostAnalytics/PostAnalytics';
import PostAnalyticsProvider from './providers/PostAnalyticsContext';
import Tags from './views/Tags/Tags';
import Web from './views/PostAnalytics/Web/Web';
import {ErrorPage} from '@tryghost/shade';
import {RouteObject, userHasRole} from '@tryghost/admin-x-framework';
import {RouterContext} from '@tryghost/admin-x-framework';
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
                loader: async ({context}) => {
                    const user = context.get(RouterContext.user);

                    if (!user) {
                        // Wait for the user to be loaded
                        return new Promise(() => {});
                    }

                    if (userHasRole(user, ['Author', 'Contributor'])) {
                        // TODO: redirect using react router instead of window.location. We can't use externalNavigate from the FrameworkProvider
                        // since that's only provided through the component context which isn't available inside of loaders.
                        // return redirect('/');
                        window.location.hash = '#/';
                    }
                },
                path: 'tags',
                element: <Tags />
            },

            // Error handling
            {
                path: '*',
                element: <ErrorPage onBackToDashboard={() => {}} /> // @TODO: add back to dashboard click handle
            }
        ]
    }
];
