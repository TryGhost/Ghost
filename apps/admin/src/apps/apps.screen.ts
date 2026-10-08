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
  managers: () => page.getByTestId(sel.appManager),

  installButton: () => button(sel.installButton),
  approveChangesButton: () => button(sel.approveChangesButton),
  tryAgainButton: () => button(sel.tryAgainButton),
  okButton: () => button(sel.okButton),
  doneButton: () => button(sel.doneButton),
  cancelButton: () => button(sel.cancelButton),
};
