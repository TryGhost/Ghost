import Newsletter from './views/post-analytics/components/Newsletter';
import Overview from './views/post-analytics/components/Overview';
import PostAnalytics from './views/post-analytics/PostAnalytics';
import Posts from './views/posts/Posts';
import {RouteObject, createHashRouter} from 'react-router';

export const BASE_PATH = '/posts-x';

const postsRoutes: RouteObject[] = [
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
            }
        ]
    }
];

export const router = createHashRouter(
    postsRoutes,
    {
        basename: BASE_PATH
    }
);
