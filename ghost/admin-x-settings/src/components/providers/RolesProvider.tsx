import React, {createContext, useContext, useEffect, useState} from 'react';
import {ServicesContext} from './ServiceProvider';
import {UserRole} from '../../types/api';

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
    const {api} = useContext(ServicesContext);
    const [roles, setRoles] = useState <UserRole[]> ([]);

    useEffect(() => {
        const fetchRoles = async (): Promise<void> => {
            try {
                const rolesData = await api.roles.browse();
                setRoles(rolesData.roles);
            } catch (error) {
                // Log error in API
            }
        };

        fetchRoles();
    }, [api]);

    return (
        <RolesContext.Provider value={{
            roles
        }}>
            {children}
        </RolesContext.Provider>
    );
};

export {RolesContext, RolesProvider};
