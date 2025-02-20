import Inbox from '@views/Inbox';
import Notifications from '@views/Notifications';
import Profile from '@views/Profile';
import Search from '@views/Search';
import {RouteObject, redirect} from '@tryghost/admin-x-framework';

export const APP_ROUTE_PREFIX = '/activitypub';

export const routes: RouteObject[] = [
    {
        path: '',
        loader: () => redirect('inbox'),
        index: true
    },
    {
        path: 'inbox',
        Component: Inbox
    },
    {
        path: 'feed',
        Component: Inbox
    },
    {
        path: 'search',
        Component: Search
    },
    {
        path: 'notifications',
        Component: Notifications
    },
    {
        path: 'profile',
        Component: Profile
    }
];

export const ROUTE_TITLES: Record<string, string> = {
    '/inbox': 'Inbox',
    '/feed': 'Feed',
    '/search': 'Search',
    '/notifications': 'Notifications',
    '/profile': 'Profile'
};
