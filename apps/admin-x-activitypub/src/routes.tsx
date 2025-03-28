import Error from '@components/layout/Error';
import Explore from '@views/Explore';
import Feed from './views/Feed/Feed';
import Inbox from '@views/Inbox';
import InboxRR from './views/Inbox/Inbox-RR';
import Notifications from '@views/Notifications';
import Onboarding from '@components/layout/Onboarding';
import OnboardingStep1 from '@components/layout/Onboarding/Step1';
import OnboardingStep2 from '@components/layout/Onboarding/Step2';
import OnboardingStep3 from '@components/layout/Onboarding/Step3';
import Post from './views/Feed/Post';
import Profile from '@views/Profile';
import ProfileRR from '@views/Profile/Profile-RR';
import {Navigate, RouteObject} from '@tryghost/admin-x-framework';

export const APP_ROUTE_PREFIX = '/activitypub';

export type CustomRouteObject = RouteObject & {
    pageTitle?: string;
    children?: CustomRouteObject[];
};

export const routes: CustomRouteObject[] = [
    {
        // Root route configuration
        path: '',
        errorElement: <Error />, // This will catch all errors in child routes
        children: [
            // `ap-routes` related routes
            {
                path: 'inbox-rr',
                element: <InboxRR />,
                pageTitle: 'Inbox'
            },
            {
                path: 'inbox-rr/:postId',
                element: <InboxRR />,
                pageTitle: 'Inbox'
            },
            {
                path: 'feed-rr',
                element: <Feed />,
                pageTitle: 'Feed'
            },
            {
                path: 'feed-rr/:postId',
                element: <Post />,
                pageTitle: 'Feed'
            },
            {
                path: 'profile-rr',
                element: <ProfileRR />,
                pageTitle: 'Profile'
            },
            {
                path: 'profile-rr/:handle',
                element: <ProfileRR />,
                pageTitle: 'Profile'
            },

            // ---
            {
                index: true,
                element: <Navigate to="inbox" />
            },
            {
                path: 'inbox',
                element: <Inbox />,
                pageTitle: 'Inbox'
            },
            {
                path: 'feed',
                element: <Inbox />,
                pageTitle: 'Feed'
            },
            {
                path: 'notifications',
                element: <Notifications />,
                pageTitle: 'Notifications'
            },
            {
                path: 'explore',
                element: <Explore />,
                pageTitle: 'Explore'
            },
            {
                path: 'profile',
                element: <Profile />,
                pageTitle: 'Profile'
            },
            {
                path: 'welcome',
                element: <Onboarding />,
                pageTitle: 'Welcome',
                children: [
                    {
                        path: '',
                        element: <Navigate to="1" replace />
                    },
                    {
                        path: '1',
                        element: <OnboardingStep1 />
                    },
                    {
                        path: '2',
                        element: <OnboardingStep2 />
                    },
                    {
                        path: '3',
                        element: <OnboardingStep3 />
                    },
                    {
                        path: '*',
                        element: <Navigate to="1" replace />
                    }
                ]
            },
            {
                path: '*',
                element: <Error />
            }
        ]
    }
];
