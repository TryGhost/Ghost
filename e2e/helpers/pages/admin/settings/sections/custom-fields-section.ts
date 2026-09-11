import { BasePage } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';
import {
  customFieldAccess,
  customFieldListItem,
  customFieldModal,
  customFields,
} from '@tryghost/test-data/selectors/settings';

export type CustomFieldAudience = 'Only staff' | 'Members can view' | 'Members can edit';

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
  async createField(name: string, type?: string, audience?: CustomFieldAudience): Promise<void> {
    await this.addButton.waitFor();
    await this.addButton.click();
    await this.modal.getByLabel('Name').fill(name);

    if (type) {
      await this.modal.getByTestId('custom-field-type').click();
      await this.page.getByRole('option', { name: type, exact: true }).click();
    }

    if (audience) {
      await this.chooseAudience(audience);
    }

    await this.modal.getByRole('button', { name: 'Save' }).click();
    await this.listItem(name).waitFor();
  }

  async setAudience(name: string, audience: CustomFieldAudience): Promise<void> {
    await this.listItem(name).click();
    await this.chooseAudience(audience);
    await this.modal.getByRole('button', { name: 'Save' }).click();
    await this.listItem(name).filter({ hasText: audience }).waitFor();
  }

  private async chooseAudience(audience: CustomFieldAudience): Promise<void> {
    await this.modal.getByTestId(customFieldAccess).click();
    await this.page.getByRole('option', { name: audience, exact: true }).click();
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
