import React, {createContext, useEffect, useState} from 'react';
import {UserRole} from '../../types/api';
import {rolesApi} from '../../utils/api';

interface RolesContextProps {
    roles: UserRole[];
}

interface RolesProviderProps {
    children?: React.ReactNode;
}

const RolesContext = createContext<RolesContextProps>({
    roles: []
});

const RolesProvider: React.FC<RolesProviderProps> = ({children}) => {
    const [roles, setRoles] = useState <UserRole[]> ([]);

    useEffect(() => {
        const fetchRoles = async (): Promise<void> => {
            try {
                const rolesData = await rolesApi.browse();
                setRoles(rolesData.roles);
            } catch (error) {
                // Log error in API
            }
        };

        fetchRoles();
    }, []);

    return (
        <RolesContext.Provider value={{
            roles
        }}>
            {children}
        </RolesContext.Provider>
    );
};

export {RolesContext, RolesProvider};
