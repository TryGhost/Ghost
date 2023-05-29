import React, {createContext, useCallback, useEffect, useState} from 'react';
import {User} from '../../types/api';
import {usersApi} from '../../utils/api';

interface UsersContextProps {
    users: User[];
    currentUser: User|null;
    updateUser?: (user: User) => Promise<void>;
}

interface UsersProviderProps {
    children?: React.ReactNode;
}

const UsersContext = createContext<UsersContextProps>({
    users: [],
    currentUser: null
});

const UsersProvider: React.FC<UsersProviderProps> = ({children}) => {
    const [users, setUsers] = useState <User[]> ([]);
    const [currentUser, setCurrentUser] = useState <User|null> (null);

    useEffect(() => {
        const fetchUsers = async (): Promise<void> => {
            try {
                // get list of staff users from the API
                const data = await usersApi.browse();
                const user = await usersApi.currentUser();
                setUsers(data.users);
                setCurrentUser(user);
            } catch (error) {
                // Log error in API
            }
        };

        fetchUsers();
    }, []);

    const updateUser = useCallback(async (user: User): Promise<void> => {
        try {
            // Make an API call to save the updated settings
            const data = await usersApi.edit(user);
            setUsers((usersState) => {
                return usersState.map((u) => {
                    if (u.id === user.id) {
                        return data.users[0];
                    }
                    return u;
                });
            });
        } catch (error) {
            // Log error in settings API
        }
    }, []);

    return (
        <UsersContext.Provider value={{
            users,
            currentUser,
            updateUser
        }}>
            {children}
        </UsersContext.Provider>
    );
};

export {UsersContext, UsersProvider};
