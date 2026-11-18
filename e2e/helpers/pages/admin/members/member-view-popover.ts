import { Locator, Page } from '@playwright/test';

/**
 * The save/edit-view popover on the members list; Radix gives it the dialog role.
 * Saving a new view and renaming the open one both submit with "Save"; only
 * editing offers "Delete", which asks for confirmation inline.
 */
export class MemberViewPopover {
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;
  readonly deleteButton: Locator;
  readonly deleteConfirmation: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog');
    this.nameInput = this.dialog.getByRole('textbox', { name: 'View name' });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save', exact: true });
    this.deleteButton = this.dialog.getByRole('button', { name: 'Delete', exact: true });
    this.deleteConfirmation = this.dialog.getByText('Delete view?', { exact: true });
  }

  async waitForPopover(): Promise<void> {
    await this.dialog.waitFor({ state: 'visible' });
  }

  async enterName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
    await this.dialog.waitFor({ state: 'hidden' });
  }

  /** The confirming button carries the same "Delete" label as the one that asks. */
  async delete(): Promise<void> {
    await this.deleteButton.click();
    await this.deleteConfirmation.waitFor({ state: 'visible' });
    await this.deleteButton.click();
    await this.dialog.waitFor({ state: 'hidden' });
  }

  async close(): Promise<void> {
    await this.nameInput.press('Escape');
    await this.dialog.waitFor({ state: 'hidden' });
  }
}
