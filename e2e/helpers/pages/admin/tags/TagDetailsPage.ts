import {Locator, Page} from '@playwright/test';
import {AdminPage} from '../AdminPage';

export class TagDetailsPage extends AdminPage {
    readonly nameInput: Locator;
    readonly slugInput: Locator;
    readonly descriptionInput: Locator;
    readonly saveButton: Locator;
    readonly deleteButton: Locator;
    readonly deleteConfirmButton: Locator;
    readonly deleteCancelButton: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/tags/';
        this.nameInput = page.getByRole('textbox', {name: 'Name'});
        this.slugInput = page.getByRole('textbox', {name: 'Slug'});
        this.descriptionInput = page.getByRole('textbox', {name: 'Description'});
        this.saveButton = page.getByRole('button', {name: 'Save'});
        this.deleteButton = page.getByRole('button', {name: 'Delete tag'});
        this.deleteConfirmButton = page.getByRole('button', {name: 'Delete', exact: true});
        this.deleteCancelButton = page.getByRole('button', {name: 'Cancel'});
    }

    async deleteTag() {
        await this.deleteButton.click();
        await this.deleteConfirmButton.click();
        await this.deleteCancelButton.waitFor({state: 'hidden'});
    }
}
