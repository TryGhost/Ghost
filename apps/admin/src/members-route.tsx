import {Navigate} from "@tryghost/admin-x-framework";
import {useCurrentUser} from "@tryghost/admin-x-framework/api/current-user";
import {canManageMembers} from "@tryghost/admin-x-framework/api/users";
import {MembersRouteGate} from "./members-route-gate";

export function MembersRoute() {
    const {data: currentUser, isError, isLoading} = useCurrentUser();

    if (!currentUser) {
        if (isError || !isLoading) {
            return <Navigate replace to="/" />;
        }

        return null;
    }

    if (!canManageMembers(currentUser)) {
        return <Navigate replace to="/" />;
    }

    return <MembersRouteGate />;
}
