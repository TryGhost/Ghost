import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {ServicesContext} from './ServiceProvider';
import {User} from '../../types/api';
import {UserInvite} from '../../utils/api';

interface UsersContextProps {
    users: User[];
    invites: UserInvite[];
    currentUser: User|null;
    updateUser?: (user: User) => Promise<void>;
    setInvites: (invites: UserInvite[]) => void;
    setUsers: React.Dispatch<React.SetStateAction<User[]>>
}

interface UsersProviderProps {
    children?: React.ReactNode;
}

const UsersContext = createContext<UsersContextProps>({
    users: [],
    invites: [],
    currentUser: null,
    setInvites: () => {},
    setUsers: () => {}
});

const UsersProvider: React.FC<UsersProviderProps> = ({children}) => {
    const {api} = useContext(ServicesContext);
    const [users, setUsers] = useState <User[]> ([]);
    const [invites, setInvites] = useState <UserInvite[]> ([]);
    const [currentUser, setCurrentUser] = useState <User|null> (null);

    useEffect(() => {
        const fetchUsers = async (): Promise<void> => {
            try {
                // get list of staff users from the API
                const data = await api.users.browse();
                const user = await api.users.currentUser();
                const invitesRes = await api.invites.browse();
                setUsers(data.users);
                setCurrentUser(user);
                setInvites(invitesRes.invites);
            } catch (error) {
                // Log error in API
            }
        };

        fetchUsers();
    }, [api]);

    const updateUser = useCallback(async (user: User): Promise<void> => {
        try {
            // Make an API call to save the updated settings
            const data = await api.users.edit(user);
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
    }, [api]);

    return (
        <UsersContext.Provider value={{
            users,
            invites,
            currentUser,
            updateUser,
            setInvites,
            setUsers
        }}>
            {children}
        </UsersContext.Provider>
    );
};

export {UsersContext, UsersProvider};
