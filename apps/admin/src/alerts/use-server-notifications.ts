import { useEffect, useRef } from 'react';
import {
  type ServerNotification,
  useBrowseNotifications,
  useDeleteNotification,
} from '@tryghost/admin-x-framework/api/notifications';
import type { AlertsStore } from './alerts-store';

/** Each notice shows once per page load, so clears and refetches never revive it; only a user close deletes it. */
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
