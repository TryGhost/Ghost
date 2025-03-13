import Explore from '@views/Explore';
import Inbox from '@views/Inbox';
import Notifications from '@views/Notifications';
import Onboarding from '@components/layout/Onboarding';
import OnboardingStep1 from '@components/layout/Onboarding/Step1';
import OnboardingStep2 from '@components/layout/Onboarding/Step2';
import OnboardingStep3 from '@components/layout/Onboarding/Step3';
import Profile from '@views/Profile';
import {Navigate, RouteObject} from '@tryghost/admin-x-framework';

export const APP_ROUTE_PREFIX = '/activitypub';

type CustomRouteObject = RouteObject & {
    pageTitle?: string;
};

export const routes: CustomRouteObject[] = [
    {
        path: '',
        index: true,
        element: <Navigate to="inbox" replace />
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
    }
];
