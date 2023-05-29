import {User} from '../types/api';
import {UsersContext} from '../components/providers/UsersProvider';
import {useContext} from 'react';

export type UsersHook = {
    users: User[];
    ownerUser: User;
    adminUsers: User[];
    editorUsers: User[];
    authorUsers: User[];
    contributorUsers: User[];
    currentUser: User|null;
    updateUser?: (user: User) => Promise<void>;
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
    const {users, currentUser, updateUser} = useContext(UsersContext);
    const ownerUser = getOwnerUser(users);
    const adminUsers = getUsersByRole(users, 'Administrator');
    const editorUsers = getUsersByRole(users, 'Editor');
    const authorUsers = getUsersByRole(users, 'Author');
    const contributorUsers = getUsersByRole(users, 'Contributor');

    return {
        users,
        ownerUser,
        adminUsers,
        editorUsers,
        authorUsers,
        contributorUsers,
        currentUser,
        updateUser
    };
};

export default useStaffUsers;
