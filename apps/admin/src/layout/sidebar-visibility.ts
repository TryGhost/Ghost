import {useMatches} from "@tryghost/admin-x-framework";
import {useSidebarVisibility as useEmberSidebarVisibility} from "@/ember-bridge/ember-bridge";

export type AdminRouteHandle = {
    hideAdminSidebar?: boolean;
};

export function useAdminSidebarVisibility(): boolean {
    const emberSidebarVisible = useEmberSidebarVisibility();
    const matches = useMatches();

    const routeHidesSidebar = matches.some((match) => {
        const handle = match.handle as AdminRouteHandle | undefined;
        return handle?.hideAdminSidebar === true;
    });

    return emberSidebarVisible && !routeHidesSidebar;
}
