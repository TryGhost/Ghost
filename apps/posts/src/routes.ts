import Newsletter from './views/post-analytics/components/Newsletter';
import Overview from './views/post-analytics/components/Overview';
import PostAnalytics from './views/post-analytics/PostAnalytics';
import Posts from './views/posts/Posts';
import {RouteObject} from '@tryghost/admin-x-framework';

export const APP_ROUTE_PREFIX = '/posts-x';

export const routes: RouteObject[] = [
    {
        path: '',
        Component: Posts
    },
    {
        path: 'analytics/:postId',
        Component: PostAnalytics,
        children: [
            {
                path: '',
                Component: Overview
            },
            {
                path: 'overview',
                Component: Overview
            },
            {
                path: 'newsletter',
                Component: Newsletter
            },
            {
                path: 'share',
                Component: Overview
            }
        ]
    }
];
