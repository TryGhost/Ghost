import { useLocation } from '@tryghost/admin-x-framework';
import { NavMenuItem } from './nav-menu-item';
import { useMemberViews, type MemberView } from './hooks/use-member-views';

/**
 * Convert a filter record to a URL search params string
 */
function filterToSearchString(filter: Record<string, string | null>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filter)) {
        if (value != null) {
            params.set(key, value);
        }
    }
    return params.toString();
}

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

    // Both must have the same number of params
    const currentKeys = Array.from(currentParams.keys()).sort();
    const viewKeys = Array.from(viewParams.keys()).sort();

    if (currentKeys.length !== viewKeys.length) {
        return false;
    }

    return currentKeys.every((key, i) =>
        key === viewKeys[i] && currentParams.get(key) === viewParams.get(key)
    );
}

function MemberViewItem({ view, isOnMembersForward, currentSearch }: {
    view: MemberView;
    isOnMembersForward: boolean;
    currentSearch: string;
}) {
    const searchString = filterToSearchString(view.filter);
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
