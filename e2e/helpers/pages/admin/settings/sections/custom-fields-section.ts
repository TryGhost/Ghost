import { BasePage } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';
import {
  customFieldListItem,
  customFieldModal,
  customFields,
} from '@tryghost/test-data/selectors/settings';

/**
 * Settings -> Membership -> Custom fields. Defining fields is behind the
 * `membersCustomFields` flag, so a test using this section must enable that flag via
 * test.use({labs: {membersCustomFields: true}}).
 */
export class CustomFieldsSection extends BasePage {
  readonly section: Locator;
  readonly addButton: Locator;
  readonly modal: Locator;

  constructor(page: Page) {
    super(page, '/ghost/#/settings');

    this.section = page.getByTestId(customFields);
    this.addButton = this.section.getByRole('button', { name: 'Add custom field' });
    this.modal = page.getByTestId(customFieldModal);
  }

  listItem(name: string): Locator {
    return this.section.getByTestId(customFieldListItem).filter({ hasText: name });
  }

  /** Creates a field of the named type. The modal closes itself on success. */
  async createField(name: string, type?: string): Promise<void> {
    await this.addButton.waitFor();
    await this.addButton.click();
    await this.modal.getByLabel('Name').fill(name);

    if (type) {
      await this.modal.getByTestId('custom-field-type').click();
      await this.page.getByRole('option', { name: type, exact: true }).click();
    }

    await this.modal.getByRole('button', { name: 'Save' }).click();
    await this.listItem(name).waitFor();
  }

  /** Short text is the default type, and keeps the member detail editor a plain input. */
  async createShortTextField(name: string): Promise<void> {
    await this.createField(name);
  }

  /**
   * An address is a composite: one field storing several named parts, each filtered as a
   * field in its own right. See `MemberDetailsPage.setCompositeCustomFieldValue`.
   */
  async createAddressField(name: string): Promise<void> {
    await this.createField(name, 'Address');
  }
}
