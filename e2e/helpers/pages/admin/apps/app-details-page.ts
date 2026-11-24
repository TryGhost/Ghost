import * as sel from '@tryghost/test-data/selectors/apps';
import { AdminPage } from '@/admin-pages';
import { Locator, Page } from '@playwright/test';

/** An installation's details: what it runs, its history, and Uninstall in its actions menu. */
export class AppDetailsPage extends AdminPage {
  readonly details: Locator;
  readonly historyEntries: Locator;
  readonly actionsButton: Locator;
  readonly uninstallMenuItem: Locator;
  readonly uninstallDialog: Locator;

  constructor(page: Page) {
    super(page);
    this.details = page.getByTestId(sel.appDetails);
    this.historyEntries = page.getByTestId(sel.appHistoryEntry);
    this.actionsButton = this.details.getByRole('button', {
      name: sel.detailsActionsButton,
      exact: true,
    });
    // The menu renders in a portal, outside the details.
    this.uninstallMenuItem = page.getByRole('menuitem', { name: sel.uninstallButton, exact: true });
    this.uninstallDialog = page.getByTestId(sel.appUninstallDialog);
  }

  async gotoDetails(installationId: string): Promise<void> {
    await this.goto(`/ghost/#/apps/details/${installationId}`);
  }

  /** A history entry's title, with who made the change if anyone did, but not its date. */
  historyTitle(index: number): Locator {
    return this.historyEntries.nth(index).getByTestId(sel.appHistoryEntryTitle);
  }

  /** Opens a history entry to show what it changed in the app's access. */
  async openHistoryEntry(index: number): Promise<void> {
    await this.historyEntries.nth(index).getByRole('button').click();
  }

  /** The text shown under the app's name. */
  description(text: string): Locator {
    return this.details.getByText(text, { exact: true });
  }

  async uninstall(): Promise<void> {
    await this.actionsButton.click();
    await this.uninstallMenuItem.click();
    await this.uninstallDialog
      .getByRole('button', { name: sel.uninstallButton, exact: true })
      .click();
    await this.uninstallDialog.waitFor({ state: 'hidden' });
  }
}
