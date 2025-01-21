import Newsletter from './views/post-analytics/components/Newsletter';
import Overview from './views/post-analytics/components/Overview';
import PostAnalytics from './views/post-analytics/PostAnalytics';
import {createHashRouter} from 'react-router';

export const BASE_PATH = '/posts-x';
export const ANALYTICS = `${BASE_PATH}/analytics`;

const postAnalyticsRoutes = [
    {
        path: `${BASE_PATH}/analytics/:postId`,
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

export const router = createHashRouter(postAnalyticsRoutes);
