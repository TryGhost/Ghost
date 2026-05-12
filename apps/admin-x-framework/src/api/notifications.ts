import {createMutation, createQuery} from '../utils/api/hooks';

export type Notification = {
    id: string;
    custom?: boolean;
    dismissible?: boolean;
    message: string;
    status?: 'alert' | 'notification';
    type?: 'info' | 'warn' | 'error' | 'success';
    top?: boolean;
    createdAt?: string;
    seen?: boolean;
};

export interface NotificationsResponseType {
    notifications: Notification[];
}

const dataType = 'NotificationsResponseType';

export const useBrowseNotifications = createQuery<NotificationsResponseType>({
    dataType,
    path: '/notifications/'
});

export const useDeleteNotification = createMutation<void, string>({
    method: 'DELETE',
    path: id => `/notifications/${id}/`,
    invalidateQueries: {
        dataType
    }
});
