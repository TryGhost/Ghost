import React, {createContext, useEffect, useState} from 'react';
import {User} from '../../types/api';
import {getUsers} from '../../utils/api';

interface UsersContextProps {
  users: User[];
}

interface UsersProviderProps {
    children?: React.ReactNode;
}

const UsersContext = createContext<UsersContextProps>({
    users: []
});

const UsersProvider: React.FC<UsersProviderProps> = ({children}) => {
    const [users, setUsers] = useState <User[]> ([]);

    useEffect(() => {
        const fetchUsers = async (): Promise<void> => {
            try {
                // get list of staff users from the API
                const data = await getUsers();
                setUsers(data.users);
            } catch (error) {
                // Log error in API
            }
        };

        fetchUsers();
    }, []);

    // Provide the settings and the saveSettings function to the children components
    return (
        <UsersContext.Provider value={{users}}>
            {children}
        </UsersContext.Provider>
    );
};

export {UsersContext, UsersProvider};
