import Inbox from '@views/Inbox';
import Notifications from '@views/Notifications';
import Profile from '@views/Profile';
import Search from '@views/Search';
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
        path: 'search',
        Component: Search,
        pageTitle: 'Search'
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
    }
];
