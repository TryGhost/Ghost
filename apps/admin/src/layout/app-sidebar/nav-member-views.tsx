import {NavSavedViews} from './nav-saved-views';
import {useMemberSidebarViews} from './member-sidebar-views';

export function NavMemberViews() {
    const memberViews = useMemberSidebarViews();
    return <NavSavedViews views={memberViews} />;
}
