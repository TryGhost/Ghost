import { Locator, Page } from '@playwright/test';
import { PortalPage } from './portal-page';

/**
 * Portal -> Account -> Account settings, where a member edits their own details and
 * the custom fields a publisher has opened to them.
 */
export class PortalAccountProfilePage extends PortalPage {
  readonly title: Locator;
  readonly saveButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);

    this.title = this.portalFrame.getByRole('heading', { name: 'Account settings' });
    this.saveButton = this.portalFrame.getByRole('button', { name: 'Save' });
    this.backButton = this.portalFrame.getByRole('button', { name: 'Back' });
  }

  /** A scalar field's single input, named for the field it holds. */
  fieldInput(key: string): Locator {
    return this.portalFrame.locator(`[name="custom:${key}"]`);
  }

  /** One part of a composite field, such as the first line of an address. */
  partInput(key: string, part: string): Locator {
    return this.portalFrame.locator(`[name="custom:${key}:${part}"]`);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
