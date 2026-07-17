import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

/**
 * Settings -> Membership -> Custom fields. The whole section is behind the
 * `membersCustomFields` flag, so a test using it must enable that flag via
 * test.use({labs: {membersCustomFields: true}}).
 */
export class CustomFieldsSection extends BasePage {
    readonly section: Locator;
    readonly addButton: Locator;
    readonly modal: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.section = page.getByTestId('custom-fields');
        this.addButton = this.section.getByRole('button', {name: 'Add custom field'});
        this.modal = page.getByTestId('custom-field-modal');
    }

    listItem(name: string): Locator {
        return this.section.getByTestId('custom-field-list-item').filter({hasText: name});
    }

    /**
     * Create a field of the default (short text) type. That keeps the member
     * detail editor a plain text input, which is all the cross-surface flow
     * needs. The modal closes itself on success.
     */
    async createShortTextField(name: string): Promise<void> {
        await this.addButton.waitFor();
        await this.addButton.click();
        await this.modal.getByLabel('Name').fill(name);
        await this.modal.getByRole('button', {name: 'Save'}).click();
        await this.listItem(name).waitFor();
    }
}
