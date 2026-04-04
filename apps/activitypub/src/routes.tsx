import AppError from '@components/layout/error';

import {Navigate, Outlet, RouteObject, lazyComponent} from '@tryghost/admin-x-framework';

const basePath = import.meta.env.VITE_TEST ? '' : 'activitypub';

export type CustomRouteObject = RouteObject & {
    pageTitle?: string;
    children?: CustomRouteObject[];
    showBackButton?: boolean;
};

export const routes: CustomRouteObject[] = [
    {
        // Root route that defines the app's base path
        path: basePath,
        element: <Outlet />,
        errorElement: <AppError />, // This will catch all errors in child routes
        handle: 'activitypub-basepath',
        children: [
            {
                index: true,
                element: <Navigate to="reader" />
            },
            {
                path: 'inbox',
                element: <Navigate to="../reader" replace />
            },
            {
                path: 'feed',
                element: <Navigate to="../notes" replace />
            },
            {
                path: 'reader',
                lazy: lazyComponent(() => import('./views/inbox')),
                pageTitle: 'Reader'
            },
            {
                path: 'reader/:postId',
                lazy: lazyComponent(() => import('./views/inbox')),
                pageTitle: 'Reader'
            },
            {
                path: 'notes',
                lazy: lazyComponent(() => import('./views/feed/feed')),
                pageTitle: 'Notes'
            },
            {
                path: 'notes/:postId',
                lazy: lazyComponent(() => import('./views/feed/note')),
                pageTitle: 'Note'
            },
            {
                path: 'notifications',
                lazy: lazyComponent(() => import('./views/notifications')),
                pageTitle: 'Notifications'
            },
            {
                path: 'explore',
                lazy: lazyComponent(() => import('./views/explore')),
                pageTitle: 'Explore'
            },
            {
                path: 'explore/:topic',
                lazy: lazyComponent(() => import('./views/explore')),
                pageTitle: 'Explore'
            },
            {
                path: 'profile',
                lazy: lazyComponent(() => import('./views/profile')),
                pageTitle: 'Profile'
            },
            {
                path: 'profile/likes',
                lazy: lazyComponent(() => import('./views/profile')),
                pageTitle: 'Profile'
            },
            {
                path: 'profile/following',
                lazy: lazyComponent(() => import('./views/profile')),
                pageTitle: 'Profile'
            },
            {
                path: 'profile/followers',
                lazy: lazyComponent(() => import('./views/profile')),
                pageTitle: 'Profile'
            },
            {
                path: 'profile/:handle/:tab?',
                lazy: lazyComponent(() => import('./views/profile')),
                pageTitle: 'Profile'
            },
            {
                path: 'preferences',
                lazy: lazyComponent(() => import('./views/preferences')),
                pageTitle: 'Preferences'
            },
            {
                path: 'preferences/moderation',
                lazy: lazyComponent(() => import('./views/preferences/components/moderation')),
                pageTitle: 'Moderation',
                showBackButton: true
            },
            {
                path: 'preferences/bluesky-sharing',
                lazy: lazyComponent(() => import('./views/preferences/components/bluesky-sharing')),
                showBackButton: true
            },
            {
                path: 'welcome',
                lazy: lazyComponent(() => import('./components/layout/onboarding')),
                pageTitle: 'Welcome',
                children: [
                    {
                        path: '',
                        element: <Navigate to="1" replace />
                    },
                    {
                        path: '1',
                        lazy: lazyComponent(() => import('./components/layout/onboarding/step-1'))
                    },
                    {
                        path: '2',
                        lazy: lazyComponent(() => import('./components/layout/onboarding/step-2'))
                    },
                    {
                        path: '3',
                        lazy: lazyComponent(() => import('./components/layout/onboarding/step-3'))
                    },
                    {
                        path: '*',
                        element: <Navigate to="1" replace />
                    }
                ]
            },
            {
                path: '*',
                lazy: lazyComponent(() => import('./components/layout/error'))
            }
        ]
    }
];
