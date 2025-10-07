import {UserRoleType} from '../api/roles';
import {User} from '../api/users';

/**
 * Pure function to check if a user has any of the required roles.
 * Can be used outside of React components (e.g., in React Router loaders).
 * 
 * @param currentUser - The current user object (can be null or undefined)
 * @param userRoles - Array of roles to check against
 * @returns true if the user has at least one of the required roles, false otherwise
 */
export const userHasRole = (currentUser: User | null | undefined, userRoles: UserRoleType[]): boolean => {
    if (!currentUser?.roles || currentUser.roles.length === 0) {
        return false;
    }
    
    const roleNames = currentUser.roles.map(role => role.name);
    return userRoles.some((role => roleNames.includes(role)));
};
