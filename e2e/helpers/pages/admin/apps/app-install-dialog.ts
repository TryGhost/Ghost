import * as sel from '@tryghost/test-data/selectors/apps';
import { Locator, Page } from '@playwright/test';

/** The review an install link opens, also used to approve an installed app's changes. */
export class AppInstallDialog {
  public readonly modal: Locator;
  /** Says the app changed while it was being reviewed. */
  public readonly notice: Locator;
  /** What changed, for an app the site already has, one row per field. */
  public readonly changes: Locator;
  /** One line per resource the app asks for. */
  public readonly accessItems: Locator;
  /** The scopes the app's backend may use on its own, shown apart with a warning. */
  public readonly backendAccess: Locator;
  /** The scopes an approval would add, marked as new where the access list shows them. */
  public readonly newAccess: Locator;
  public readonly installButton: Locator;
  public readonly approveChangesButton: Locator;
  public readonly cancelButton: Locator;

  constructor(page: Page) {
    this.modal = page.getByTestId(sel.appInstallDialog);
    this.notice = this.modal.getByTestId(sel.appInstallNotice);
    this.changes = this.modal.getByTestId(sel.appManifestChange);
    this.accessItems = this.modal.getByTestId(sel.accessItem);
    this.backendAccess = this.modal.getByTestId(sel.appBackendAccess);
    this.newAccess = this.modal.getByTestId(sel.accessNew);
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
