import {Outlet} from "@tryghost/admin-x-framework";
import {EmberFallback} from "./ember-bridge";
import {useFeatureFlag} from "./hooks/use-feature-flag";

export function MembersRouteGate() {
    const membersForwardEnabled = useFeatureFlag("membersForward");

    if (!membersForwardEnabled) {
        return <EmberFallback />;
    }

    return <Outlet />;
}
