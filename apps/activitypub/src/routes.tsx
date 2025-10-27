import BlueskySharing from '@views/Preferences/components/BlueskySharing';
import Error from '@components/layout/Error';
import Explore from '@views/Explore';
import Feed from './views/Feed/Feed';
import Inbox from '@views/Inbox';
import Moderation from '@views/Preferences/components/Moderation';
import Note from './views/Feed/Note';
import Notifications from '@views/Notifications';
import Onboarding from '@components/layout/Onboarding';
import OnboardingStep1 from '@components/layout/Onboarding/Step1';
import OnboardingStep2 from '@components/layout/Onboarding/Step2';
import OnboardingStep3 from '@components/layout/Onboarding/Step3';
import Preferences from '@views/Preferences';
import Profile from '@views/Profile';
import {Navigate, RouteObject, useLocation} from '@tryghost/admin-x-framework';

export const APP_ROUTE_PREFIX = '/';

export type CustomRouteObject = RouteObject & {
    pageTitle?: string;
    children?: CustomRouteObject[];
    showBackButton?: boolean;
};

const ActivityPubToNetworkRedirect = () => {
    const location = useLocation();
    const newPath = location.pathname.replace(/^\/activitypub/, '/network');
    return <Navigate to={`${newPath}${location.search}${location.hash}`} replace />;
};

export const routes: CustomRouteObject[] = [
    {
        // Root route configuration
        path: 'network',
        errorElement: <Error />, // This will catch all errors in child routes
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
                element: <Inbox />,
                pageTitle: 'Reader'
            },
            {
                path: 'reader/:postId',
                element: <Inbox />,
                pageTitle: 'Reader'
            },
            {
                path: 'notes',
                element: <Feed />,
                pageTitle: 'Notes'
            },
            {
                path: 'notes/:postId',
                element: <Note />,
                pageTitle: 'Note'
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
                path: 'profile/likes',
                element: <Profile />,
                pageTitle: 'Profile'
            },
            {
                path: 'profile/following',
                element: <Profile />,
                pageTitle: 'Profile'
            },
            {
                path: 'profile/followers',
                element: <Profile />,
                pageTitle: 'Profile'
            },
            {
                path: 'profile/:handle/:tab?',
                element: <Profile />,
                pageTitle: 'Profile'
            },
            {
                path: 'preferences',
                element: <Preferences />,
                pageTitle: 'Preferences'
            },
            {
                path: 'preferences/moderation',
                element: <Moderation />,
                pageTitle: 'Moderation',
                showBackButton: true
            },
            {
                path: 'preferences/bluesky-sharing',
                element: <BlueskySharing />,
                showBackButton: true
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
    },
    {
        path: 'activitypub',
        element: <Navigate to="/network" replace />
    },
    {
        path: 'activitypub/*',
        element: <ActivityPubToNetworkRedirect />
    }
];
