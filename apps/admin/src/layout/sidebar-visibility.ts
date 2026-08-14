import {type AdminRouteHandle, useMatches} from "@tryghost/admin-x-framework";
import {useSidebarVisibility as useEmberSidebarVisibility} from "@/ember-bridge/ember-bridge";

function hidesAdminSidebar(handle: unknown): handle is AdminRouteHandle {
    return typeof handle === "object" && handle !== null && "hideAdminSidebar" in handle && handle.hideAdminSidebar === true;
}

export function useAdminSidebarVisibility(): boolean {
    const emberSidebarVisible = useEmberSidebarVisibility();
    const matches = useMatches();

    const routeHidesSidebar = matches.some(match => hidesAdminSidebar(match.handle));

    return emberSidebarVisible && !routeHidesSidebar;
}
