import * as sel from '@tryghost/test-data/selectors/apps';
import { AdminPage } from '@/admin-pages';
import { Locator, Page } from '@playwright/test';

/** An installation's details: what it runs, its history, and Uninstall. */
export class AppDetailsPage extends AdminPage {
  readonly details: Locator;
  readonly historyEntries: Locator;
  readonly uninstallButton: Locator;
  readonly uninstallDialog: Locator;

  constructor(page: Page) {
    super(page);
    this.details = page.getByTestId(sel.appDetails);
    this.historyEntries = page.getByTestId(sel.appHistoryEntry);
    this.uninstallButton = this.details.getByRole('button', {
      name: sel.uninstallButton,
      exact: true,
    });
    this.uninstallDialog = page.getByTestId(sel.appUninstallDialog);
  }

  async gotoDetails(installationId: string): Promise<void> {
    await this.goto(`/ghost/#/apps/details/${installationId}`);
  }

  /** A history entry's title, with who made the change if anyone did, but not its date. */
  historyTitle(index: number): Locator {
    return this.historyEntries.nth(index).locator(':scope > span').first();
  }

  /** The text shown under the app's name. */
  description(text: string): Locator {
    return this.details.getByText(text, { exact: true });
  }

  async uninstall(): Promise<void> {
    await this.uninstallButton.click();
    await this.uninstallDialog
      .getByRole('button', { name: sel.uninstallButton, exact: true })
      .click();
    await this.uninstallDialog.waitFor({ state: 'hidden' });
  }
}
