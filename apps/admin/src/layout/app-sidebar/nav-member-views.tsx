import { useLocation } from '@tryghost/admin-x-framework';
import { NavMenuItem } from './nav-menu-item';
import { useMemberViews, filterRecordToSearchParams, isViewSearchActive, type MemberView } from '@tryghost/posts/src/views/members/hooks/use-member-views';

function MemberViewItem({ view, isOnMembersForward, currentSearch }: {
    view: MemberView;
    isOnMembersForward: boolean;
    currentSearch: string;
}) {
    const searchString = filterRecordToSearchParams(view.filter).toString();
    const to = `members-forward?${searchString}`;
    const active = isOnMembersForward && isViewSearchActive(currentSearch, view.filter);

    return (
        <NavMenuItem key={view.name}>
            <NavMenuItem.Link
                className="pl-9"
                to={to}
                isActive={active}
            >
                <NavMenuItem.Label>{view.name}</NavMenuItem.Label>
            </NavMenuItem.Link>
        </NavMenuItem>
    );
}

export function NavMemberViews() {
    const memberViews = useMemberViews();
    const location = useLocation();

    if (memberViews.length === 0) {
        return null;
    }

    const isOnMembersForward = location.pathname === '/members-forward';

    return (
        <>
            {memberViews.map(view => (
                <MemberViewItem
                    key={view.name}
                    view={view}
                    isOnMembersForward={isOnMembersForward}
                    currentSearch={location.search}
                />
            ))}
        </>
    );
}
