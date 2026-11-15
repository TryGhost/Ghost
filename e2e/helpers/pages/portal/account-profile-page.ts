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

  /**
   * The button beside a phone field's number that shows the country the number is from, as its
   * calling code, and opens the list of countries to pick from.
   */
  phoneCountry(key: string): Locator {
    return this.portalFrame.locator(`[data-test-input="input-custom:${key}-country"]`);
  }

  /** The search box over the list that is open, which shows what it searches as its placeholder. */
  listSearch(placeholder: string): Locator {
    return this.portalFrame.getByPlaceholder(placeholder, { exact: true });
  }

  /** One part of a composite field, such as the first line of an address. */
  partInput(key: string, part: string): Locator {
    return this.portalFrame.locator(`[name="custom:${key}:${part}"]`);
  }

  /** A list field's picker: the button that opens its options, named for the field it holds. */
  listPicker(key: string): Locator {
    return this.portalFrame.locator(`[data-test-input="input-custom:${key}"]`);
  }

  /** An option of the list whose picker is open. */
  listOption(option: string): Locator {
    return this.portalFrame.getByRole('option', { name: option, exact: true });
  }

  /** The chip of an answer held by a list field that takes several, found by its remove button. */
  listAnswer(answer: string): Locator {
    return this.portalFrame.getByRole('button', { name: `Remove ${answer}`, exact: true });
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
