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

    tab(name: 'Active' | 'Archived'): Locator {
        return this.section.getByRole('tab', {name});
    }

    async openTab(name: 'Active' | 'Archived'): Promise<void> {
        await this.tab(name).click();
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

    /** Open a field's edit modal from whichever tab it lives in. */
    async openField(name: string): Promise<void> {
        await this.listItem(name).click();
        await this.modal.waitFor();
    }

    /** Rename a field in place; the modal closes on success. */
    async renameField(name: string, newName: string): Promise<void> {
        await this.openField(name);
        await this.modal.getByLabel('Name').fill(newName);
        await this.modal.getByRole('button', {name: 'Save'}).click();
        await this.listItem(newName).waitFor();
    }

    /**
     * Archive an active field. Both the edit modal and the confirmation dialog
     * carry an "Archive" button; the edit modal closes as the confirmation
     * opens, so the second click lands on the confirmation.
     */
    async archiveField(name: string): Promise<void> {
        await this.openField(name);
        await this.modal.getByRole('button', {name: 'Archive'}).click();
        // The edit modal removes itself as the confirmation opens; wait for it to
        // go so the confirmation's "Archive" button is the only match.
        await this.modal.waitFor({state: 'detached'});
        await this.page.getByRole('button', {name: 'Archive'}).click();
    }

    /** Reactivate an archived field (open it from the Archived tab first). */
    async reactivateField(name: string): Promise<void> {
        await this.openField(name);
        await this.modal.getByRole('button', {name: 'Reactivate'}).click();
        await this.modal.waitFor({state: 'detached'});
        await this.page.getByRole('button', {name: 'Reactivate'}).click();
    }

    /**
     * Permanently delete an archived field. Deletion lives behind the modal's
     * header menu, then a destructive confirmation — the API only allows it on
     * an already-archived field.
     */
    async deleteField(name: string): Promise<void> {
        await this.openField(name);
        await this.modal.getByRole('button', {name: 'Menu'}).click();
        await this.page.getByRole('menuitem', {name: 'Delete custom field'}).click();
        await this.modal.waitFor({state: 'detached'});
        await this.page.getByRole('button', {name: 'Delete', exact: true}).click();
    }
}
