import { useLocation } from '@tryghost/admin-x-framework';
import { NavMenuItem } from './nav-menu-item';
import { useMemberViews, filterRecordToSearchParams, type MemberView } from '@tryghost/posts/src/views/members/hooks/use-member-views';

/**
 * Check if the current URL search params match a view's filter
 */
function isViewActive(currentSearch: string, viewFilter: Record<string, string | null>): boolean {
    const currentParams = new URLSearchParams(currentSearch);
    const viewParams = new URLSearchParams();

    for (const [key, value] of Object.entries(viewFilter)) {
        if (value != null) {
            viewParams.set(key, value);
        }
    }

    // A view is active if all of its filter params are present and equal in the current URL
    for (const [key, value] of viewParams.entries()) {
        if (currentParams.get(key) !== value) {
            return false;
        }
    }
    return true;
}

function MemberViewItem({ view, isOnMembersForward, currentSearch }: {
    view: MemberView;
    isOnMembersForward: boolean;
    currentSearch: string;
}) {
    const searchString = filterRecordToSearchParams(view.filter).toString();
    const to = `members-forward?${searchString}`;
    const active = isOnMembersForward && isViewActive(currentSearch, view.filter);

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
