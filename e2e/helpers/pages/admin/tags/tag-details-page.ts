import { AdminPage } from '@/admin-pages';
import { Locator, Page } from '@playwright/test';
import {
  descriptionFieldLabel,
  nameFieldLabel,
  slugFieldLabel,
  tagsBackLink,
} from '@tryghost/test-data/selectors/tags';

export class TagDetailsPage extends AdminPage {
  readonly nameInput: Locator;
  readonly slugInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly saveButtonSuccess: Locator;
  readonly backLink: Locator;

  constructor(page: Page) {
    super(page);

    this.nameInput = page.getByRole('textbox', { name: nameFieldLabel });
    this.slugInput = page.getByRole('textbox', { name: slugFieldLabel });
    this.descriptionInput = page.getByRole('textbox', { name: descriptionFieldLabel });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.saveButtonSuccess = page.getByRole('button', { name: 'Saved' });

    this.backLink = page.locator(`[data-test-link="${tagsBackLink}"]`);
  }

  async fillTagName(name: string) {
    await this.nameInput.fill(name);
  }

  async fillTagSlug(slug: string) {
    await this.slugInput.fill(slug);
  }

  async fillTagDescription(description: string) {
    await this.descriptionInput.fill(description);
  }

  async save() {
    await this.saveButton.click();
    await this.saveButtonSuccess.waitFor({ state: 'visible' });
  }

  async goBackToTagsList() {
    await this.backLink.click();
  }
}
