import {UserRoleType} from '../api/roles';
import {useGlobalData} from '../components/providers/GlobalDataProvider';

export const usePermission = (userRoles:string[]) => {
    const {currentUser} = useGlobalData();
    const currentUserRoles = currentUser?.roles.map(role => role.name);
    if (!currentUserRoles) {
        return false;
    }
    return userRoles.some((role => currentUserRoles.includes(role as UserRoleType)));
};
