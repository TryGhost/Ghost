import {useCurrentUser} from '../api/currentUser';
import {UserRoleType} from '../api/roles';
import {userHasRole} from '../utils/roles';

/**
 * React hook to check if the current user has any of the required roles.
 * 
 * @param userRoles - Array of roles to check against
 * @returns true if the current user has at least one of the required roles, false otherwise
 */
export const usePermission = (userRoles: UserRoleType[]) => {
    const {data: currentUser} = useCurrentUser();
    return userHasRole(currentUser, userRoles);
};
