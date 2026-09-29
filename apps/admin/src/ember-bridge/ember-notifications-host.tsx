import { useEffect } from 'react';
import { toast } from 'sonner';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { type AlertsStore, type RichText, RichTextContent, richTextValue } from '@/alerts';
import { connectEmberNotificationsHost } from './ember-bridge';

export type EmberNotificationStatus = 'alert' | 'notification';

export interface EmberNotification {
  status: EmberNotificationStatus;
  type?: string;
  message: RichText;
  description?: RichText;
  actions?: RichText;
  key?: string;
}

/** What Ember's notifications service calls once React has connected. */
export interface EmberNotificationsHost {
  show(notification: EmberNotification): void;
  remove(status: EmberNotificationStatus, key?: string): void;
  clearAll(): void;
}

// Sonner keeps every id it has seen, so ids must never repeat across hosts.
let nextToastId = 0;

// "noun.verb.message" keys dedupe on their "noun.verb" prefix.
function matchesKeyBase(itemKey: string | undefined, key: string) {
  const keyBase = key.split('.').slice(0, 2).join('.');
  return Boolean(itemKey?.startsWith(keyBase));
}

function showToast(notification: EmberNotification, id: string, onGone: () => void) {
  const { type, message, description, actions } = notification;
  const options = {
    id,
    description:
      description || actions ? (
        <Stack className="[&_a]:underline" gap="sm">
          {description && (
            <p>
              <RichTextContent value={description} />
            </p>
          )}
          {actions && (
            <Inline className="text-text-secondary" gap="sm">
              <RichTextContent value={actions} />
            </Inline>
          )}
        </Stack>
      ) : undefined,
    onDismiss: onGone,
    onAutoClose: onGone,
  };
  const title = <RichTextContent value={message} />;

  if (type === 'error') {
    toast.error(title, options);
  } else if (type === 'warn') {
    toast.warning(title, options);
  } else if (type === 'info') {
    toast.info(title, options);
  } else {
    toast.success(title, options);
  }
}

/**
 * Applies the Ember notifications service's rules on top of React's alerts
 * store and Sonner: alerts go to the store, toasts ("notifications") to
 * Sonner. Only toasts shown through this host are ever dismissed by it.
 */
export function createEmberNotificationsHost(alerts: AlertsStore): EmberNotificationsHost {
  const toasts = new Map<string, { key?: string; text: string }>();

  const dismissToasts = (predicate: (item: { key?: string; text: string }) => boolean) => {
    for (const [id, item] of toasts) {
      if (predicate(item)) {
        toasts.delete(id);
        toast.dismiss(id);
      }
    }
  };

  const remove = (status: EmberNotificationStatus, key?: string) => {
    if (status === 'alert') {
      alerts.remove((alert) => !key || matchesKeyBase(alert.key, key));
    } else {
      dismissToasts((item) => !key || matchesKeyBase(item.key, key));
    }
  };

  return {
    show(notification) {
      if (notification.key) {
        remove(notification.status, notification.key);
      }

      const text = richTextValue(notification.message);
      alerts.remove((alert) => richTextValue(alert.message) === text);
      dismissToasts((item) => item.text === text);

      if (notification.status === 'alert') {
        alerts.show({
          type: notification.type,
          message: notification.message,
          key: notification.key,
        });
        return;
      }

      nextToastId += 1;
      const id = `ember-toast-${nextToastId}`;
      toasts.set(id, { key: notification.key, text });
      showToast(notification, id, () => toasts.delete(id));
    },
    remove,
    clearAll() {
      alerts.remove(() => true);
      dismissToasts(() => true);
    },
  };
}

/** Routes Ember's notifications through React while Ember is mounted. */
export function useEmberNotificationsHost(alerts: AlertsStore) {
  useEffect(() => connectEmberNotificationsHost(createEmberNotificationsHost(alerts)), [alerts]);
}
