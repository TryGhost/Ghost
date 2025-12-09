import {useCurrentUser} from '../api/current-user';
import {UserRoleType} from '../api/roles';

export const usePermission = (requiredRoles?: string[] | null) => {
    const {data: currentUser} = useCurrentUser();

    // No permissions required = allow all
    if (!requiredRoles || requiredRoles.length === 0) {
        return true;
    }

    const currentUserRoles = currentUser?.roles.map(role => role.name);
    if (!currentUserRoles) {
        return false;
    }
    return requiredRoles.some((role => currentUserRoles.includes(role as UserRoleType)));
};
