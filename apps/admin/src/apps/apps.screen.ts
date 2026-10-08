import { page } from 'vitest/browser';
import * as sel from '@tryghost/test-data/selectors/apps';

const button = (name: string) => page.getByRole('button', { name, exact: true });

/** Apps screen locators for acceptance specs; no assertions. */
export const appsScreen = {
  rows: () => page.getByTestId(sel.appsListRow),
  row: (name: string) => page.getByTestId(sel.appsListRow).filter({ hasText: name }),
  emptyState: () => page.getByText(sel.emptyStateText),

  installDialog: () => page.getByTestId(sel.appInstallDialog),
  notAllowedDialog: () => page.getByTestId(sel.appInstallNotAllowedDialog),
  developmentBadge: () =>
    page.getByTestId(sel.appInstallDialog).getByTestId(sel.appDevelopmentBadge),
  accessIndicator: () => page.getByTestId(sel.accessIndicator),
  accessItems: () => page.getByTestId(sel.accessItem),
  capabilities: () => page.getByTestId(sel.appCapability),
  notice: () => page.getByTestId(sel.appInstallNotice),
  moveWarning: () => page.getByTestId(sel.appInstallMoveWarning),
  problems: () => page.getByTestId(sel.appInstallProblems),
  unreachable: () => page.getByTestId(sel.appInstallUnreachable),
  changes: () => page.getByTestId(sel.appManifestChange),

  sidebarLink: () =>
    page.getByTestId('admin-sidebar').getByRole('link', { name: 'Apps', exact: true }),
  rowActions: (name: string) => page.getByRole('button', { name: `More actions for ${name}` }),
  menuItem: (name: string) => page.getByRole('menuitem', { name }),
  details: () => page.getByTestId(sel.appDetails),
  needsApproval: () => page.getByTestId(sel.appNeedsApproval),
  historyEntries: () => page.getByTestId(sel.appHistoryEntry),
  uninstallDialog: () => page.getByTestId(sel.appUninstallDialog),
  integrationKeyNote: () => page.getByTestId(sel.appUninstallIntegrationKeyNote),

  installButton: () => button(sel.installButton),
  approveChangesButton: () => button(sel.approveChangesButton),
  tryAgainButton: () => button(sel.tryAgainButton),
  okButton: () => button(sel.okButton),
  doneButton: () => button(sel.doneButton),
  cancelButton: () => button(sel.cancelButton),
  uninstallButton: () => button(sel.uninstallButton),
  reviewChangesLink: () => page.getByRole('link', { name: sel.reviewChangesLink, exact: true }),
};
