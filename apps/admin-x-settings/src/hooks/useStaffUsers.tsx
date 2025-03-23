import {User, useBrowseUsers} from '@tryghost/admin-x-framework/api/users';
import {UserInvite, useBrowseInvites} from '@tryghost/admin-x-framework/api/invites';
import {useBrowseRoles} from '@tryghost/admin-x-framework/api/roles';
import {useGlobalData} from '../components/providers/GlobalDataProvider';
import {useMemo} from 'react';

export type UsersHook = {
    totalUsers: number;
    users: User[];
    invites: UserInvite[];
    ownerUser: User;
    adminUsers: User[];
    editorUsers: User[];
    authorUsers: User[];
    contributorUsers: User[];
    currentUser: User|null;
    isLoading: boolean;
    hasNextPage?: boolean;
    fetchNextPage: () => void;
};

function getUsersByRole(users: User[], role: string): User[] {
    return users.filter((user) => {
        return user.roles.find((userRole) => {
            return userRole.name === role;
        });
    });
}

function getUsersByRoles(users: User[], roles: string[]): User[] {
    return users.filter((user) => {
        return user.roles.find((userRole) => {
            return roles.includes(userRole.name);
        });
    });
}

function getOwnerUser(users: User[]): User {
    return getUsersByRole(users, 'Owner')[0];
}

const useStaffUsers = (): UsersHook => {
    const {currentUser} = useGlobalData();
    const {data: {users, meta, isEnd} = {users: []}, isLoading: usersLoading, fetchNextPage} = useBrowseUsers();
    const {data: {invites} = {invites: []}, isLoading: invitesLoading} = useBrowseInvites();
    const {data: {roles} = {}, isLoading: rolesLoading} = useBrowseRoles();

    const ownerUser = useMemo(() => getOwnerUser(users), [users]);
    const adminUsers = useMemo(() => getUsersByRole(users, 'Administrator'), [users]);
    const editorUsers = useMemo(() => getUsersByRoles(users, ['Editor', 'Super Editor']), [users]);
    const authorUsers = useMemo(() => getUsersByRole(users, 'Author'), [users]);
    const contributorUsers = useMemo(() => getUsersByRole(users, 'Contributor'), [users]);
    const mappedInvites = useMemo(() => invites.map((invite) => {
        let role = roles?.find((r) => {
            return invite.role_id === r.id;
        });
        return {
            ...invite,
            role: role?.name
        };
    }), [invites, roles]);

    return {
        totalUsers: meta?.pagination.total || 0,
        users,
        ownerUser,
        adminUsers,
        editorUsers,
        authorUsers,
        contributorUsers,
        currentUser,
        invites: mappedInvites,
        isLoading: usersLoading || invitesLoading || rolesLoading,
        hasNextPage: isEnd === false,
        fetchNextPage
    };
};

export default useStaffUsers;
