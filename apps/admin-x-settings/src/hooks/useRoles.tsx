import {RolesContext} from '../components/providers/RolesProvider';
import {UserRole} from '../types/api';
import {useContext} from 'react';

export type RolesHook = {
    roles: UserRole[];
    assignableRoles: UserRole[];
    getRoleId: (roleName: string, roles: UserRole[]) => string;
};

function getRoleId(roleName: string, roles: UserRole[]): string {
    const role = roles.find((r) => {
        return r.name.toLowerCase() === roleName?.toLowerCase();
    });

    return role?.id || '';
}

const useRoles = (): RolesHook => {
    const {roles, assignableRoles} = useContext(RolesContext);

    return {
        roles,
        assignableRoles,
        getRoleId
    };
};

export default useRoles;
