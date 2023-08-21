import {User, useBrowseUsers} from '../api/users';
import {UserInvite, useBrowseInvites} from '../api/invites';
import {useBrowseRoles} from '../api/roles';
import {useGlobalData} from '../components/providers/GlobalDataProvider';

export type UsersHook = {
    users: User[];
    invites: UserInvite[];
    ownerUser: User;
    adminUsers: User[];
    editorUsers: User[];
    authorUsers: User[];
    contributorUsers: User[];
    currentUser: User|null;
    isLoading: boolean;
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
    const {currentUser} = useGlobalData();
    const {data: {users} = {users: []}, isLoading: usersLoading} = useBrowseUsers();
    const {data: {invites} = {invites: []}, isLoading: invitesLoading} = useBrowseInvites();
    const {data: {roles} = {}, isLoading: rolesLoading} = useBrowseRoles();

    const ownerUser = getOwnerUser(users);
    const adminUsers = getUsersByRole(users, 'Administrator');
    const editorUsers = getUsersByRole(users, 'Editor');
    const authorUsers = getUsersByRole(users, 'Author');
    const contributorUsers = getUsersByRole(users, 'Contributor');
    const mappedInvites = invites.map((invite) => {
        let role = roles?.find((r) => {
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
        isLoading: usersLoading || invitesLoading || rolesLoading
    };
};

export default useStaffUsers;
