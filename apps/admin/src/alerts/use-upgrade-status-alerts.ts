import { useEffect, useRef } from 'react';
import { onUpgradeStatus, type UpgradeStatus } from '@tryghost/admin-x-framework';
import type { AlertsStore } from './alerts-store';

const upgradeStatusAlerts: Record<UpgradeStatus, { key: string; message: string }> = {
  'upgrade-required': {
    key: 'api-error.upgrade-required',
    message:
      'Ghost has been upgraded, please copy any unsaved data and refresh the page to continue.',
  },
  maintenance: {
    key: 'api-error.under-maintenance',
    message:
      'Sorry, Ghost is currently undergoing maintenance, please wait a moment then try again.',
  },
};

/** Each alert shows at most once per page load; keys match Ember's so either side replaces the other's. */
export function useUpgradeStatusAlerts(store: AlertsStore) {
  const shown = useRef(new Set<UpgradeStatus>());

  useEffect(
    () =>
      onUpgradeStatus((status) => {
        if (shown.current.has(status)) {
          return;
        }
        shown.current.add(status);

        const { key, message } = upgradeStatusAlerts[status];
        store.remove((alert) => alert.key === key);
        store.show({ type: 'error', key, message });
      }),
    [store],
  );
}
