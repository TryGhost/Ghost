import type { RichText } from './rich-text';

export interface Alert {
  id: string;
  type?: string;
  message: RichText;
  key?: string;
  /** Runs when the user closes the alert, never on programmatic removal. */
  onClose?: () => void;
}

export interface AlertsStore {
  show: (alert: Omit<Alert, 'id'>) => string;
  close: (id: string) => void;
  remove: (predicate: (alert: Alert) => boolean) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => readonly Alert[];
}

export function createAlertsStore(): AlertsStore {
  let alerts: readonly Alert[] = [];
  let nextId = 0;
  const listeners = new Set<() => void>();

  const set = (next: readonly Alert[]) => {
    if (next.length === alerts.length && next.every((alert, index) => alert === alerts[index])) {
      return;
    }
    alerts = next;
    listeners.forEach((listener) => listener());
  };

  return {
    show: (alert) => {
      nextId += 1;
      const id = `alert-${nextId}`;
      set([...alerts, { ...alert, id }]);
      return id;
    },
    close: (id) => {
      const alert = alerts.find((item) => item.id === id);
      if (!alert) {
        return;
      }
      set(alerts.filter((item) => item !== alert));
      alert.onClose?.();
    },
    remove: (predicate) => {
      set(alerts.filter((alert) => !predicate(alert)));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => alerts,
  };
}
