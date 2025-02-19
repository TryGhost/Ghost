import Inbox from '@views/Inbox';
import Notifications from '@views/Notifications';
import Profile from '@views/Profile';
import Search from '@views/Search';
import {RouteObject} from '@tryghost/admin-x-framework';

export const APP_ROUTE_PREFIX = '/activitypub';

export const routes: RouteObject[] = [
    {
        path: '',
        Component: Inbox
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
