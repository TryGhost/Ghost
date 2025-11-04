import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';

export class MemberDetailsPage extends AdminPage {
    readonly nameInput: Locator;
    readonly emailInput: Locator;
    readonly noteInput: Locator;
    readonly labelsInput: Locator;

    readonly saveButton: Locator;
    readonly savedButton: Locator;
    readonly deleteButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members/';

        this.nameInput = page.getByRole('textbox', {name: 'Name'});
        this.emailInput = page.getByRole('textbox', {name: 'Email'});
        this.noteInput = page.getByRole('textbox', {name: 'Note'});
        this.labelsInput = page.getByText('Labels').locator('+ div');

        this.saveButton = page.getByRole('button', {name: 'Save'});
        this.savedButton = page.getByRole('button', {name: 'Saved'});
        this.deleteButton = page.getByRole('button', {name: 'Delete member'});
    }

    async addLabel(label: string): Promise<void> {
        await this.labelsInput.click();
        await this.page.keyboard.type(label);
        await this.page.keyboard.press('Tab');
    }

    async save(): Promise<void> {
        await this.saveButton.click();
        await this.savedButton.waitFor({state: 'visible'});
    }
}
