import { useMemo } from "react";
import { type User, useBrowseUsers } from "@tryghost/admin-x-framework/api/users";
import { type UserInvite, useBrowseInvites } from "@tryghost/admin-x-framework/api/invites";
import { useBrowseRoles } from "@tryghost/admin-x-framework/api/roles";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";

/**
 * Staff users/invites grouped by role, ported from
 * apps/admin-x-settings/src/hooks/use-staff-users.tsx (current user comes
 * from useCurrentUser instead of the legacy GlobalDataProvider).
 */

export interface StaffUsersHook {
    totalUsers: number;
    totalInvites: number;
    users: User[];
    invites: UserInvite[];
    ownerUser: User | undefined;
    adminUsers: User[];
    editorUsers: User[];
    authorUsers: User[];
    contributorUsers: User[];
    currentUser: User | null;
    isLoading: boolean;
    hasNextPage?: boolean;
    invitesHasNextPage?: boolean;
    fetchNextPage: () => void;
    fetchNextInvitePage: () => void;
}

function getUsersByRoles(users: User[], roles: string[]): User[] {
    return users.filter((user) => user.roles.find((userRole) => roles.includes(userRole.name)));
}

export function useStaffUsers(): StaffUsersHook {
    const { data: currentUser = null } = useCurrentUser();
    const { data: { users, meta, isEnd } = { users: [] }, isLoading: usersLoading, fetchNextPage } = useBrowseUsers();
    const {
        data: { invites, meta: invitesMeta, isEnd: invitesIsEnd } = { invites: [] },
        isLoading: invitesLoading,
        fetchNextPage: fetchNextInvitePage,
    } = useBrowseInvites();
    const { data: { roles } = {}, isLoading: rolesLoading } = useBrowseRoles();

    const ownerUser = useMemo(() => getUsersByRoles(users, ["Owner"])[0], [users]);
    const adminUsers = useMemo(() => getUsersByRoles(users, ["Administrator"]), [users]);
    const editorUsers = useMemo(() => getUsersByRoles(users, ["Editor", "Super Editor"]), [users]);
    const authorUsers = useMemo(() => getUsersByRoles(users, ["Author"]), [users]);
    const contributorUsers = useMemo(() => getUsersByRoles(users, ["Contributor"]), [users]);
    const mappedInvites = useMemo(() => invites.map((invite) => ({
        ...invite,
        role: roles?.find((role) => invite.role_id === role.id)?.name,
    })), [invites, roles]);

    return {
        totalUsers: meta?.pagination.total || 0,
        totalInvites: invitesMeta?.pagination.total || 0,
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
        invitesHasNextPage: invitesIsEnd === false,
        fetchNextPage: () => void fetchNextPage(),
        fetchNextInvitePage: () => void fetchNextInvitePage(),
    };
}
