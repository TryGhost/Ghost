import type {ReadonlyDeep} from 'type-fest';
import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation, createQueryWithId} from '../utils/api/hooks';
import {deleteFromQueryCache, updateQueryCache} from '../utils/api/update-queries';
import {usersDataType} from './current-user';
import {UserRole} from './roles';

// Types

export type User = {
    id: string;
    name: string;
    slug: string;
    email: string;
    profile_image: string|null;
    cover_image: string|null;
    bio: string|null;
    website: string|null;
    location: string|null;
    facebook: string|null;
    twitter: string|null;
    threads: string|null;
    bluesky: string|null;
    mastodon: string|null;
    tiktok: string|null;
    youtube: string|null;
    instagram: string|null;
    linkedin: string|null;
    accessibility: string|null;
    status: string;
    meta_title: string|null;
    meta_description: string|null;
    tour: string|null;
    last_seen: string|null;
    created_at: string;
    updated_at: string;
    comment_notifications: boolean;
    free_member_signup_notification: boolean;
    paid_subscription_canceled_notification: boolean;
    paid_subscription_started_notification: boolean;
    mention_notifications: boolean;
    recommendation_notifications: boolean;
    milestone_notifications: boolean;
    donation_notifications: boolean;
    gift_subscription_notifications: boolean;
    roles: UserRole[];
    url: string;
}

export interface UsersResponseType {
    meta?: Meta;
    users: User[];
}

export interface UpdateUserRequestBody {
    users: Array<User>;
}

interface UpdatePasswordOptions {
    newPassword: string;
    confirmNewPassword: string;
    userId: string;
    oldPassword?: string;
}

export interface PasswordUpdateResponseType {
    password: [{
        message: string;
    }];
}

export interface DeleteUserResponse {
    meta: {
        filename: string;
    }
}

// Requests

const dataType = usersDataType;

export const useBrowseUsers = createInfiniteQuery<UsersResponseType & {isEnd: boolean}>({
    dataType,
    path: '/users/',
    defaultSearchParams: {limit: '100', include: 'roles'},
    defaultNextPageParams: (lastPage, otherParams) => ({
        ...otherParams,
        page: (lastPage.meta?.pagination.next || 1).toString()
    }),
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<UsersResponseType>;
        const users = pages.flatMap(page => page.users);
        const meta = pages[pages.length - 1].meta;

        return {
            users: users,
            meta,
            isEnd: meta ? meta.pagination.pages === meta.pagination.page : true
        };
    }
});

export const useGetUserBySlug = createQueryWithId<UsersResponseType>({
    dataType,
    path: slug => `/users/slug/${slug}/`,
    defaultSearchParams: {include: 'roles'}
});

export const useEditUser = createMutation<UsersResponseType, User>({
    method: 'PUT',
    path: user => `/users/${user.id}/`,
    body: user => ({users: [user]}),
    searchParams: () => ({include: 'roles'}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('users')
    }
});

export const useDeleteUser = createMutation<DeleteUserResponse, string>({
    method: 'DELETE',
    path: id => `/users/${id}/`,
    updateQueries: {
        dataType,
        emberUpdateType: 'delete',
        update: deleteFromQueryCache('users')
    }
});

export const useUpdatePassword = createMutation<PasswordUpdateResponseType, UpdatePasswordOptions>({
    method: 'PUT',
    path: () => '/users/password/',
    body: ({newPassword, confirmNewPassword, userId, oldPassword}) => ({
        password: [{
            user_id: userId,
            oldPassword: oldPassword || '',
            newPassword: newPassword,
            ne2Password: confirmNewPassword
        }]
    })
});

export const useMakeOwner = createMutation<UsersResponseType, string>({
    method: 'PUT',
    path: () => '/users/owner/',
    body: userId => ({
        owner: [{
            id: userId
        }]
    }),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('users')
    }
});

// Helpers

type HasRoles = ReadonlyDeep<{
    roles: Array<Pick<UserRole, 'name'>>;
}>;

export function isOwnerUser(user: HasRoles) {
    return user.roles.some(role => role.name === 'Owner');
}

export function isAdminUser(user: HasRoles) {
    return user.roles.some(role => role.name === 'Administrator');
}

export function isEditorUser(user: HasRoles) {
    const isAnyEditor = user.roles.some(role => role.name === 'Editor')
        || user.roles.some(role => role.name === 'Super Editor');
    return isAnyEditor;
}

export function isSuperEditorUser(user: HasRoles) {
    return user.roles.some(role => role.name === 'Super Editor');
}

export function isAuthorUser(user: HasRoles) {
    return user.roles.some(role => role.name === 'Author');
}

export function isContributorUser(user: HasRoles) {
    return user.roles.some(role => role.name === 'Contributor');
}

export function isAuthorOrContributor(user: HasRoles) {
    return isAuthorUser(user) || isContributorUser(user);
}

export function canAccessSettings(user: HasRoles) {
    return isOwnerUser(user) || isAdminUser(user) || isEditorUser(user);
}

export function canManageMembers(user: HasRoles) {
    // Owner, Admin, or Super Editor can manage members
    return isOwnerUser(user) || isAdminUser(user) || isSuperEditorUser(user);
}

export function canManageTags(user: HasRoles) {
    // Owner, Admin or Editor can manage tags
    return isOwnerUser(user) || isAdminUser(user) || isEditorUser(user);
}

export function canManageGiftLinks(user: HasRoles) {
    // Owner, Admin or Editor can manage gift links
    return isOwnerUser(user) || isAdminUser(user) || isEditorUser(user);
}

export function hasAdminAccess(user: HasRoles) {
    return isOwnerUser(user) || isAdminUser(user);
}

export function canManageAutomations(user: HasRoles) {
    // Only Owner and Admin can edit automations. This matches the API permission rows,
    // which grant automation browse/read/edit to Administrator + Admin Integration
    // (the Owner role inherits all permissions). Super Editors can manage members but
    // cannot edit automations, so we must not gate on canManageMembers here.
    return isOwnerUser(user) || isAdminUser(user);
}
