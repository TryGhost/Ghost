import { Locator, Page } from '@playwright/test';

/** The save/edit-view popover on the posts list; Radix gives it the dialog role. */
export class CustomViewModal {
  public readonly modal: Locator;
  public readonly nameInput: Locator;
  public readonly nameError: Locator;
  public readonly saveButton: Locator;
  public readonly deleteButton: Locator;
  public readonly deleteConfirmation: Locator;

  constructor(page: Page) {
    this.modal = page.getByRole('dialog');
    this.nameInput = this.modal.getByLabel('View name');
    this.nameError = this.modal.getByRole('alert');
    // "Save view" when creating, "Save" when editing.
    this.saveButton = this.modal.getByRole('button', { name: /^Save( view)?$/ });
    this.deleteButton = this.modal.getByRole('button', { name: 'Delete', exact: true });
    this.deleteConfirmation = this.modal.getByText('Delete view?', { exact: true });
  }

  async waitForModal(): Promise<void> {
    await this.modal.waitFor({ state: 'visible' });
  }

  async enterName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async selectColor(color: string): Promise<void> {
    await this.modal.getByRole('radio', { name: color, exact: true }).click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  /** Delete asks inline first; the confirming button carries the same label. */
  async delete(): Promise<void> {
    await this.deleteButton.click();
    await this.deleteConfirmation.waitFor({ state: 'visible' });
    await this.deleteButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }
}
