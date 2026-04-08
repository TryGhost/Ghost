import {useLocation} from '@tryghost/admin-x-framework';
import {useMemo} from 'react';
import {type NavSavedView} from './nav-saved-views';
import {type SharedView, useSharedViews} from './shared-views';

interface MemberSidebarView extends SharedView {
    route: 'members';
    filter: Record<string, string | null> & {
        filter: string;
    };
}

function isMemberSidebarView(view: SharedView): view is MemberSidebarView {
    return view.route === 'members' && typeof view.filter.filter === 'string' && view.filter.filter.length > 0;
}

function getMemberViewUrl(filter: string) {
    return `members?${new URLSearchParams({filter}).toString()}`;
}

function isMemberViewActive(pathname: string, currentSearch: string, filter: string) {
    if (pathname !== '/members') {
        return false;
    }

    return new URLSearchParams(currentSearch).get('filter') === filter;
}

export function useMemberSidebarViews() {
    const location = useLocation();
    const sharedViews = useSharedViews('members');

    return useMemo<NavSavedView[]>(() => {
        return sharedViews
            .filter(isMemberSidebarView)
            .map((view) => ({
                key: `${view.name}:${view.filter.filter}`,
                name: view.name,
                to: getMemberViewUrl(view.filter.filter),
                isActive: isMemberViewActive(location.pathname, location.search, view.filter.filter)
            }));
    }, [location.pathname, location.search, sharedViews]);
}
