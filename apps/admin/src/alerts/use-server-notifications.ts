import { useEffect, useRef } from 'react';
import {
  type ServerNotification,
  useBrowseNotifications,
  useDeleteNotification,
} from '@tryghost/admin-x-framework/api/notifications';
import type { AlertsStore } from './alerts-store';

/**
 * Shows custom server notifications (e.g. security and release notices) as
 * alerts, the last one per location. Each is shown once per page load, so
 * programmatic clears and refetches never bring a notice back; closing one
 * deletes it, which marks it seen for this user.
 */
export function useServerNotifications(store: AlertsStore) {
  const { data } = useBrowseNotifications({ defaultErrorHandler: false });
  const { mutate: deleteNotification } = useDeleteNotification();
  const shownIds = useRef(new Set<string>());

  useEffect(() => {
    if (!data) {
      return;
    }

    const lastByLocation = new Map<string | undefined, ServerNotification>();
    for (const notification of data.notifications) {
      if (notification.custom) {
        lastByLocation.set(notification.location, notification);
      }
    }

    for (const notification of lastByLocation.values()) {
      if (shownIds.current.has(notification.id)) {
        continue;
      }
      shownIds.current.add(notification.id);

      const key = notification.location;
      store.remove((alert) => alert.key === key);
      store.show({
        type: notification.type,
        message: { html: notification.message },
        key,
        onClose: () => deleteNotification(notification.id),
      });
    }
  }, [data, deleteNotification, store]);
}
