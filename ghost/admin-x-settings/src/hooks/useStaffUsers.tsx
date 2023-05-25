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
};

function getUsersByRole(users: User[], role: string): User[] {
    return users.filter((user) => {
        return user.roles.find((userRole) => {
            return userRole.name === role;
        });
    });
}

const useStaffUsers = (): UsersHook => {
    const {users} = useContext(UsersContext);
    const ownerUser = getUsersByRole(users, 'Owner')[0] || null;
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
        contributorUsers
    };
};

export default useStaffUsers;
