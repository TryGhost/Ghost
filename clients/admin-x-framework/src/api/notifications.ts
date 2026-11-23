import { createMutation, createQuery } from '../utils/api/hooks';

export type ServerNotification = {
  id: string;
  type: string;
  status: string;
  message: string;
  custom?: boolean;
  dismissible?: boolean;
  location?: string;
};

export interface NotificationsResponseType {
  notifications: ServerNotification[];
}

const dataType = 'NotificationsResponseType';

export const useBrowseNotifications = createQuery<NotificationsResponseType>({
  dataType,
  path: '/notifications/',
  permissions: ['Owner', 'Administrator', 'Editor', 'Super Editor'],
});

export const useDeleteNotification = createMutation<void, string>({
  method: 'DELETE',
  path: (id) => `/notifications/${id}/`,
});
