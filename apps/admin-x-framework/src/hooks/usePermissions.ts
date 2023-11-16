import {useCurrentUser} from '../api/currentUser';
import {UserRoleType} from '../api/roles';

export const usePermission = (userRoles:string[]) => {
    const {data: currentUser} = useCurrentUser();
    const currentUserRoles = currentUser?.roles.map(role => role.name);
    if (!currentUserRoles) {
        return false;
    }
    return userRoles.some((role => currentUserRoles.includes(role as UserRoleType)));
};
