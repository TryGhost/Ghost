import { page } from 'vitest/browser';

/** Apps screen locators for acceptance specs; no assertions. */
export const appsScreen = {
  rows: () => page.getByTestId('apps-list-row'),
  row: (name: string) => page.getByTestId('apps-list-row').filter({ hasText: name }),
  emptyState: () => page.getByText('No apps yet'),
  buildAppCard: () => page.getByRole('link', { name: /Build your own app/ }),
  installDialog: () => page.getByTestId('app-install-dialog'),
  notAllowedDialog: () => page.getByTestId('app-install-not-allowed-dialog'),
  managers: () => page.getByTestId('app-manager'),
  installButton: () => page.getByRole('button', { name: 'Install', exact: true }),
  okButton: () => page.getByRole('button', { name: 'OK', exact: true }),
  frame: () => page.getByTestId('app-frame'),
  actionsButton: (name: string) =>
    page.getByTestId('apps-list').getByRole('button', { name: `More actions for ${name}` }),
  uninstallMenuItem: () => page.getByRole('menuitem', { name: 'Uninstall' }),
  pinMenuItem: () => page.getByRole('menuitem', { name: 'Pin to sidebar' }),
  uninstallDialog: () => page.getByTestId('uninstall-app-dialog'),
  confirmUninstall: () =>
    page.getByTestId('uninstall-app-dialog').getByRole('button', { name: 'Uninstall' }),
  navLink: () => page.getByRole('link', { name: 'Apps', exact: true }),
};
