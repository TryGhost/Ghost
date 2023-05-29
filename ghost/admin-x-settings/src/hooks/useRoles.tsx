import {RolesContext} from '../components/providers/RolesProvider';
import {UserRole} from '../types/api';
import {useContext} from 'react';

export type RolesHook = {
    roles: UserRole[];
};

const useRoles = (): RolesHook => {
    const {roles} = useContext(RolesContext);

    return {
        roles
    };
};

export default useRoles;
