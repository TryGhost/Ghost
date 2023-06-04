import React, {createContext, useContext, useEffect, useState} from 'react';
import {ServicesContext} from './ServiceProvider';
import {UserRole} from '../../types/api';

interface RolesContextProps {
    roles: UserRole[];
    assignableRoles: UserRole[];
}

interface RolesProviderProps {
    children?: React.ReactNode;
}

const RolesContext = createContext<RolesContextProps>({
    roles: [],
    assignableRoles: []
});

const RolesProvider: React.FC<RolesProviderProps> = ({children}) => {
    const {api} = useContext(ServicesContext);
    const [roles, setRoles] = useState <UserRole[]> ([]);
    const [assignableRoles, setAssignableRoles] = useState <UserRole[]> ([]);

    useEffect(() => {
        const fetchRoles = async (): Promise<void> => {
            try {
                const rolesData = await api.roles.browse();
                const assignableRolesData = await api.roles.browse({
                    queryParams: {
                        permissions: 'assign'
                    }
                });
                setRoles(rolesData.roles);
                setAssignableRoles(assignableRolesData.roles);
            } catch (error) {
                // Log error in API
            }
        };

        fetchRoles();
    }, [api]);

    return (
        <RolesContext.Provider value={{
            roles,
            assignableRoles
        }}>
            {children}
        </RolesContext.Provider>
    );
};

export {RolesContext, RolesProvider};
