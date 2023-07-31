import { Meta, createMutation, createQuery } from '../apiRequests';
import { User } from '../../types/api';

export interface UsersResponseType {
    meta?: Meta;
    users: User[];
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

const dataType = 'UsersResponseType';

const updateUsers = (newData: UsersResponseType, currentData: unknown) => ({
    ...(currentData as UsersResponseType),
    users: (currentData as UsersResponseType).users.map((user) => {
        const newUser = newData.users.find(({id}) => id === user.id);
        return newUser || user;
    })
});

export const useBrowseUsers = createQuery<UsersResponseType>({
    dataType,
    path: '/users/',
    defaultSearchParams: {limit: 'all', include: 'roles'}
});

export const useCurrentUser = createQuery<User>({
    dataType,
    path: '/users/me/',
    returnData: (originalData) => (originalData as UsersResponseType).users?.[0]
});

export const useEditUser = createMutation<UsersResponseType, User>({
    method: 'PUT',
    path: user => `/users/${user.id}/`,
    body: user => ({users: [user]}),
    updateQueries: {
        dataType,
        update: updateUsers
    }
});

export const useDeleteUser = createMutation<DeleteUserResponse, string>({
    method: 'DELETE',
    path: id => `/users/${id}/`,
    updateQueries: {
        dataType,
        update: (_, currentData, id) => ({
            ...(currentData as UsersResponseType),
            users: (currentData as UsersResponseType).users.filter(user => user.id !== id)
        })
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
        update: updateUsers
    }
});
