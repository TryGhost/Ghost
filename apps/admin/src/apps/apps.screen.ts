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
  trustedOrigins: () => page.getByTestId(sel.appInstallTrustedOrigins),
  problems: () => page.getByTestId(sel.appInstallProblems),
  unreachable: () => page.getByTestId(sel.appInstallUnreachable),
  unconfirmed: () => page.getByTestId(sel.appInstallUnconfirmed),
  changes: () => page.getByTestId(sel.appManifestChange),

  sidebarLink: () =>
    page.getByTestId('admin-sidebar').getByRole('link', { name: 'Apps', exact: true }),
  sidebarApps: () => page.getByTestId(sel.navApps),
  sidebarAppItems: () => page.getByTestId(sel.navApps).getByTestId(sel.navApp),
  sidebarApp: (name: string) =>
    page.getByTestId(sel.navApps).getByRole('link', { name, exact: true }),
  sidebarNeedsApproval: () => page.getByTestId(sel.navApps).getByTestId(sel.navAppNeedsApproval),
  pinToggle: (label: string) => page.getByTestId(sel.navApps).getByRole('button', { name: label }),
  eyebrow: (name: string) => page.getByTestId('admin-sidebar').getByText(name, { exact: true }),
  rowActions: (name: string) => page.getByRole('button', { name: `More actions for ${name}` }),
  menuItem: (name: string) => page.getByRole('menuitem', { name }),
  detailsMenuItem: () => page.getByRole('menuitem', { name: sel.detailsMenuItem }),
  details: () => page.getByTestId(sel.appDetails),
  appPage: () => page.getByTestId(sel.appPage),
  frame: () => page.getByTestId(sel.appFrame),
  notResponding: () => page.getByTestId(sel.appNotResponding),
  unavailable: () => page.getByTestId(sel.appUnavailable),
  notInstalled: () => page.getByTestId(sel.appNotInstalled),
  notFramed: () => page.getByTestId(sel.appNotFramed),
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
  // The same words as the link, as a button where there is nothing to link to yet.
  reviewChangesButton: () => button(sel.reviewChangesLink),
  openLink: () => page.getByRole('link', { name: sel.openLink, exact: true }),
};
