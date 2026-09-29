import { page } from 'vitest/browser';
import { adminAlert, closeAlertButton, toastRegion } from '@tryghost/test-data/selectors/alerts';

/** Alert bar and toast locators for acceptance specs; no assertions. */
export const alertsScreen = {
  alerts: () => page.getByTestId(adminAlert),
  alert: (text: string | RegExp) => page.getByTestId(adminAlert).filter({ hasText: text }),
  closeButton: (text: string | RegExp) =>
    alertsScreen.alert(text).getByRole('button', { name: closeAlertButton }),
  toast: (text: string | RegExp) =>
    page.getByRole('region', { name: toastRegion }).getByRole('listitem').filter({ hasText: text }),
};
