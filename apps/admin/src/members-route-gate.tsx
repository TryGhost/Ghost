import {Outlet, useLocation} from "@tryghost/admin-x-framework";
import {EmberFallback} from "./ember-bridge";
import {useFeatureFlag} from "./hooks/use-feature-flag";

export function MembersRouteGate() {
    const membersForwardEnabled = useFeatureFlag("membersForward");
    const location = useLocation();
    const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
    const isMembersListRoute = normalizedPath === "/members";

    if (!membersForwardEnabled && isMembersListRoute) {
        return <EmberFallback />;
    }

    return <Outlet />;
}
