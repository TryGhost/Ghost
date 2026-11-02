import * as sel from '@tryghost/test-data/selectors/apps';
import { Locator, Page } from '@playwright/test';

/** The review an install link opens, also used to approve an installed app's changes. */
export class AppInstallDialog {
  public readonly modal: Locator;
  /** Says the app changed while it was being reviewed. */
  public readonly notice: Locator;
  /** Says the app is moving to a new manifest URL. */
  public readonly moveWarning: Locator;
  public readonly installButton: Locator;
  public readonly approveChangesButton: Locator;
  public readonly cancelButton: Locator;

  constructor(page: Page) {
    this.modal = page.getByTestId(sel.appInstallDialog);
    this.notice = this.modal.getByTestId(sel.appInstallNotice);
    this.moveWarning = this.modal.getByTestId(sel.appInstallMoveWarning);
    this.installButton = this.modal.getByRole('button', { name: sel.installButton, exact: true });
    this.approveChangesButton = this.modal.getByRole('button', {
      name: sel.approveChangesButton,
      exact: true,
    });
    this.cancelButton = this.modal.getByRole('button', { name: sel.cancelButton, exact: true });
  }

  async install(): Promise<void> {
    await this.installButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  async approveChanges(): Promise<void> {
    await this.approveChangesButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }
}
