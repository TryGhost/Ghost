import Activities from './components/Activities';
import Inbox from './components/Inbox';
import Profile from './components/Profile';
import Search from './components/Search';
import {ActivityPubAPI} from './api/activitypub';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useQuery} from '@tanstack/react-query';
import {useRouting} from '@tryghost/admin-x-framework/routing';

export function useBrowseInboxForUser(handle: string) {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const siteUrl = siteData?.url ?? window.location.origin;
    const api = new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
    return useQuery({
        queryKey: [`inbox:${handle}`],
        async queryFn() {
            return api.getInbox();
        }
    });
}

export function useFollowersForUser(handle: string) {
    const site = useBrowseSite();
    const siteData = site.data?.site;
    const siteUrl = siteData?.url ?? window.location.origin;
    const api = new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
    return useQuery({
        queryKey: [`followers:${handle}`],
        async queryFn() {
            return api.getFollowers();
        }
    });
}

const MainContent = () => {
    const {route} = useRouting();
    const mainRoute = route.split('/')[0];
    switch (mainRoute) {
    case 'search':
        return <Search />;
        break;
    case 'activity':
        return <Activities />;
        break;
    case 'profile':
        return <Profile />;
        break;
    default:
        return <Inbox />;
        break;
    }
};

export default MainContent;
