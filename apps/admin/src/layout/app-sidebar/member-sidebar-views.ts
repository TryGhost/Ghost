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
    return `members-forward?${new URLSearchParams({filter}).toString()}`;
}

function isMemberViewActive(currentSearch: string, filter: string) {
    return new URLSearchParams(currentSearch).get('filter') === filter;
}

export function useMemberSidebarViews() {
    const location = useLocation();
    const sharedViews = useSharedViews('members');
    const isOnMembersForward = location.pathname === '/members-forward';

    return useMemo<NavSavedView[]>(() => {
        return sharedViews
            .filter(isMemberSidebarView)
            .map((view) => ({
                key: `${view.name}:${view.filter.filter}`,
                name: view.name,
                to: getMemberViewUrl(view.filter.filter),
                isActive: isOnMembersForward && isMemberViewActive(location.search, view.filter.filter)
            }));
    }, [isOnMembersForward, location.search, sharedViews]);
}
