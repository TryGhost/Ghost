import Inbox from '@views/Inbox';
import Notifications from '@views/Notifications';
import Profile from '@views/Profile';
import {RouteObject, redirect} from '@tryghost/admin-x-framework';

export const APP_ROUTE_PREFIX = '/activitypub';

type CustomRouteObject = RouteObject & {
    pageTitle?: string;
};

export const routes: CustomRouteObject[] = [
    {
        path: '',
        loader: () => redirect('inbox'),
        index: true,
        pageTitle: 'Inbox'
    },
    {
        path: 'inbox',
        Component: Inbox,
        pageTitle: 'Inbox'
    },
    {
        path: 'feed',
        Component: Inbox,
        pageTitle: 'Feed'
    },
    {
        path: 'notifications',
        Component: Notifications,
        pageTitle: 'Notifications'
    },
    {
        path: 'profile',
        Component: Profile,
        pageTitle: 'Profile'
    },
    {
        path: 'profile/:handle',
        Component: Profile,
        pageTitle: 'Profile'
    }
];
