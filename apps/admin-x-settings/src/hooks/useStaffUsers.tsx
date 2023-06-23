import React, {useContext} from 'react';
import {RolesContext} from '../components/providers/RolesProvider';
import {User} from '../types/api';
import {UserInvite} from '../utils/api';
import {UsersContext} from '../components/providers/UsersProvider';

export type UsersHook = {
    users: User[];
    invites: UserInvite[];
    ownerUser: User;
    adminUsers: User[];
    editorUsers: User[];
    authorUsers: User[];
    contributorUsers: User[];
    currentUser: User|null;
    updateUser?: (user: User) => Promise<void>;
    setInvites: (invites: UserInvite[]) => void;
    setUsers: React.Dispatch<React.SetStateAction<User[]>>
};

function getUsersByRole(users: User[], role: string): User[] {
    return users.filter((user) => {
        return user.roles.find((userRole) => {
            return userRole.name === role;
        });
    });
}

function getOwnerUser(users: User[]): User {
    return getUsersByRole(users, 'Owner')[0];
}

const useStaffUsers = (): UsersHook => {
    const {users, currentUser, updateUser, invites, setInvites, setUsers} = useContext(UsersContext);
    const {roles} = useContext(RolesContext);
    const ownerUser = getOwnerUser(users);
    const adminUsers = getUsersByRole(users, 'Administrator');
    const editorUsers = getUsersByRole(users, 'Editor');
    const authorUsers = getUsersByRole(users, 'Author');
    const contributorUsers = getUsersByRole(users, 'Contributor');
    const mappedInvites = invites?.map((invite) => {
        let role = roles.find((r) => {
            return invite.role_id === r.id;
        });
        return {
            ...invite,
            role: role?.name
        };
    });

    return {
        users,
        ownerUser,
        adminUsers,
        editorUsers,
        authorUsers,
        contributorUsers,
        currentUser,
        invites: mappedInvites,
        updateUser,
        setInvites,
        setUsers
    };
};

export default useStaffUsers;
