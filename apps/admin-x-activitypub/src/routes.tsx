import Inbox from '@views/Inbox';
import Notifications from '@views/Notifications';
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
        path: 'profile',
        element: <Profile />,
        pageTitle: 'Profile'
    },
    {
        path: 'profile/:handle',
        element: <Profile />,
        pageTitle: 'Profile'
    }
];
